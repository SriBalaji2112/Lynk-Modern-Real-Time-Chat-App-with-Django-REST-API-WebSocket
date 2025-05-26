import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from .models import User, Chat, Group, Message, Media, Reaction
from rest_framework_simplejwt.tokens import AccessToken
from datetime import datetime
from django.utils import timezone
import asyncio

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):

        # Safely extract token from query string
        try:
            query_string = self.scope.get('query_string', b'').decode()
            token = self.scope.get('query_string').decode().split('=')[1]
            # # print(token)
            if not token:
                raise ValueError("Empty token")
        except (IndexError, ValueError):
            await self.close(code=4001)  # Custom close code for invalid token format
            return

        # Authenticate user
        self.user = await self.authenticate_user(token)
        
        if isinstance(self.user, AnonymousUser):
            await self.close(code=4003)  # Custom close code for authentication failure
            return

        # Mark user as online
        await self.mark_user_online(True)
        
        # Join user's personal room
        await self.channel_layer.group_add(
            f"user_{self.user.id}",
            self.channel_name
        )

        friends = await self.get_user_friends()

        # Prepare all group_send tasks
        tasks = [
            self.channel_layer.group_send(
                f"user_{friend.id}",
                {
                    'type': 'friend_status_update',
                    'user_id': self.user.id,
                    'is_online': True
                }
            )
            for friend in friends
        ]

        # Execute all tasks in parallel
        await asyncio.gather(*tasks)
        
        await self.accept()

    @database_sync_to_async
    def get_user_friends(self):
        """
        Fetch the list of friends for the authenticated user.
        """
        return list(self.user.friends.all())

    @database_sync_to_async
    def authenticate_user(self, token):
        try:
            access_token = AccessToken(token)
            return User.objects.get(id=access_token['user_id'])
        except Exception:
            return AnonymousUser()

    async def disconnect(self, close_code):
        if hasattr(self, 'user') and self.user != AnonymousUser():
            # Mark user as offline
            await self.mark_user_online(False)

            friends = await self.get_user_friends()

            # Prepare all group_send tasks
            tasks = [
                self.channel_layer.group_send(
                    f"user_{friend.id}",
                    {
                        'type': 'friend_status_update',
                        'user_id': self.user.id,
                        'is_online': False,
                        'last_seen': timezone.now().isoformat()  # Optional field
                    }
                )
                for friend in friends
            ]

            # Execute all tasks in parallel
            await asyncio.gather(*tasks)

            await self.channel_layer.group_discard(
                f"user_{self.user.id}",
                self.channel_name
            )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')
        # print(data)

        handlers = {
            'private_message': self.handle_private_message,
            'group_message': self.handle_group_message,
            'media_message': self.handle_media_message,
            'reply_message': self.handle_reply_message,
            'typing': self.handle_typing_indicator,
            'read_receipt': self.handle_read_receipt,
            'reaction': self.handle_reaction,
            'message_edit': self.handle_edit_message,
            'delete_message': self.handle_delete_message,
            'forward_message': self.handle_forward_message,
            'make_as_read': self.handle_make_as_read,
            'audio_call_offer': self.handle_audio_call_offer,
            'audio_call_answer': self.handle_audio_call_answer,
            'audio_call_ice': self.handle_audio_call_ice,
            'audio_call_end': self.handle_audio_call_end,
            'video_call_offer': self.handle_video_call_offer,
            'video_call_answer': self.handle_video_call_answer,
            'video_call_ice': self.handle_video_call_ice,
            'video_call_end': self.handle_video_call_end,
        }

        if message_type in handlers:
            await handlers[message_type](data)

    # ===== MESSAGE HANDLERS =====

    async def handle_private_message(self, data):
        # print("Handling private message")
        chat_id = data['chat_id']
        message = await self.create_message(
            chat_id=chat_id,
            content=data['content'],
            message_type=data.get('message_type', 'text'),
            reply_to_id=data.get('reply_to')
        )
        # print(data)
        temp_id = data['tempId']
        message_id = message.id
        other_user = await self.get_other_chat_user(chat_id)
        # print(f"Other user: {other_user.id} Chart ID: {chat_id}")
        # await self.broadcast_message(
        #     group_name=f"chat_{other_user.id}",
        #     message=message,
        #     sender_id=self.user.id,
        #     message_type='chat_message'
        # )


        await self.channel_layer.group_send(
            f"user_{other_user.id}",
            {
                'type': 'chat_message',
                'message': await self.message_to_dict(message),
                'sender_id': self.user.id,
                'chat_id': chat_id
            }
        )
        
        await self.channel_layer.group_send(
            f"user_{self.user.id}",
            {
                'type': 'message_acknowledgment',
                'sender_id': self.user.id,
                'temp_id': temp_id,
                'message_id': message_id,
                "message_type": message.message_type,
                'chat_id': chat_id
            }
        )

        # if await self.is_user_online(other_user.id):
        #     await self.send_delivery_receipt(message.id, other_user.id)

    async def handle_make_as_read(self, data):
        message_id = data['message_id']
        chat_id = data['chat_id']
        if not message_id:
            raise ValueError("Missing message_id") 
        message = await self.get_message(message_id)
        if message.chat:
            if not await self.is_user_in_chat(message.chat.id):
                raise PermissionError("Not in this chat")
        elif message.group:
            if not await self.is_user_in_group(message.group.id):
                raise PermissionError("Not in this group")
        else:
            raise ValueError("Invalid message context")
        
        # Notify sender that message was read
        if message.sender.id != self.user.id:
            # print({
                #     'type': 'make_as_read',
                #     'sender_id': self.user.id,
                #     'message_id': message_id,
                #     'reader_id': self.user.id,
                #     'timestamp': datetime.now().isoformat(),
                #     'chat_id': chat_id,
                # })
            await self.channel_layer.group_send(
                f"user_{message.sender.id}",
                {
                    'type': 'make_as_read',
                    'sender_id': self.user.id,
                    'message_id': message_id,
                    'chat_id': chat_id,
                    'reader_id': self.user.id,
                    'timestamp': datetime.now().isoformat(),
                }
            )
        await self.mark_message_as_read(message_id)
    
    async def handle_audio_call_offer(self, data):
        chat_id = data.get('chat_id')
        offer = data.get('offer')
        other_user = await self.get_other_chat_user(chat_id)
        await self.channel_layer.group_send(
            f"user_{other_user.id}",
            {
                'type': 'audio_call_offer',
                'chat_id': chat_id,
                'offer': offer,
                'sender_id': self.user.id,
            }
        )
        

    async def handle_audio_call_answer(self, data):
        chat_id = data.get('chat_id')
        other_user_id = data.get('user_id')
        answer = data.get('answer')
        await self.channel_layer.group_send(
            f"user_{other_user_id}",
            {
                'type': 'audio_call_answer',
                'chat_id': chat_id,
                'answer': answer,
                'sender_id': self.user.id,
            }
        )

    async def handle_audio_call_ice(self, data):
        chat_id = data.get('chat_id')
        other_user_id = data.get('user_id')
        candidate = data.get('candidate')
        await self.channel_layer.group_send(
            f"user_{other_user_id}",
            {
                'type': 'audio_call_ice',
                'chat_id': chat_id,
                'candidate': candidate,
                'sender_id': self.user.id,
            }
        )

    async def handle_audio_call_end(self, data):
        other_user_id = data.get('user_id')
        chat_id = data.get('chat_id')
        # other_user = await self.get_other_chat_user(chat_id)
        await self.channel_layer.group_send(
            f"user_{other_user_id}",
            {
                'type': 'audio_call_end',
                'chat_id': chat_id,
                'sender_id': self.user.id,
            }
    )
        
        # --- VIDEO CALL SIGNALING HANDLERS ---

    async def handle_video_call_offer(self, data):
        chat_id = data.get('chat_id')
        offer = data.get('offer')
        other_user = await self.get_other_chat_user(chat_id)
        await self.channel_layer.group_send(
            f"user_{other_user.id}",
            {
                'type': 'video_call_offer',
                'chat_id': chat_id,
                'offer': offer,
                'from_user': {
                    'id': self.user.id,
                    'username': self.user.username,
                    'profile_picture': self.user.profile_picture.url if self.user.profile_picture else None,
                    'name': self.user.get_full_name() or self.user.username,
                },
                'sender_id': self.user.id,
            }
        )

    async def handle_video_call_answer(self, data):
        chat_id = data.get('chat_id')
        other_user_id = data.get('user_id')
        answer = data.get('answer')
        other_user = await self.get_other_chat_user(chat_id)
        await self.channel_layer.group_send(
            f"user_{other_user_id}",
            {
                'type': 'video_call_answer',
                'chat_id': chat_id,
                'answer': answer,
                'sender_id': self.user.id,
            }
        )

    async def handle_video_call_ice(self, data):
        chat_id = data.get('chat_id')
        other_user_id = data.get('user_id')
        candidate = data.get('candidate')
        other_user = await self.get_other_chat_user(chat_id)
        await self.channel_layer.group_send(
            f"user_{other_user_id}",
            {
                'type': 'video_call_ice',
                'chat_id': chat_id,
                'candidate': candidate,
                'sender_id': self.user.id,
            }
        )

    async def handle_video_call_end(self, data):
        other_user_id = data.get('user_id')
        chat_id = data.get('chat_id')
        if not chat_id:
            await self.send(text_data=json.dumps({
                'type': 'video_call_end_error',
                'error': 'chat_id is required'
            }))
            return
        other_user = await self.get_other_chat_user(chat_id)
        await self.channel_layer.group_send(
            f"user_{other_user_id}",
            {
                'type': 'video_call_end',
                'chat_id': chat_id,
                'sender_id': self.user.id,
            }
        )

    # --- VIDEO CALL EVENT FORWARDERS ---

    async def video_call_offer(self, event):
        if event['sender_id'] != self.user.id:
            await self._send_event('video_call_offer', event)

    async def video_call_answer(self, event):
        if event['sender_id'] != self.user.id:
            await self._send_event('video_call_answer', event)

    async def video_call_ice(self, event):
        if event['sender_id'] != self.user.id:
            await self._send_event('video_call_ice', event)

    async def video_call_end(self, event):
        if event['sender_id'] != self.user.id:
            await self._send_event('video_call_end', event)

    async def handle_group_message(self, data):
        message = await self.create_message(
            group_id=data['group_id'],
            content=data['content'],
            message_type=data.get('message_type', 'text'),
            reply_to_id=data.get('reply_to')
        )
        
        await self.broadcast_message(
            group_name=f"group_{data['group_id']}",
            message=message,
            sender_id=self.user.id,
            message_type='group_message'
        )
        
        online_members = await self.get_online_group_members(data['group_id'])
        for member in online_members:
            if member.id != self.user.id:
                await self.send_delivery_receipt(message.id, member.id)

    async def handle_media_message(self, data):
        # message, media = await self.create_media_message(
        #     chat_id=data.get('chat_id'),
        #     group_id=data.get('group_id'),
        #     media_type=data['media_type'],
        #     file_url=data['file_url'],
        #     thumbnail_url=data.get('thumbnail_url'),
        #     caption=data.get('caption', '')
        # )
        media = data.get('media')
        chat_id = data.get('chat_id')
        content = data.get('content')
        message_type = data.get('message_type', 'text')
        timestamp = data.get('timestamp', datetime.now().isoformat())
        other_user = await self.get_other_chat_user(chat_id)
        
        await self.channel_layer.group_send(
            f"user_{other_user.id}",
            {
                'type': 'chat_message',
                "message": {
                    'id': data['message_id'],
                    "content": content,
                    "media": media,
                    "timestamp": timestamp,
                    "message_type": message_type,
                    'sender_id': self.user.id
                },
                "message_type": message_type,
                'sender_id': self.user.id,
                'chat_id': chat_id,
            }
        )

    async def handle_reply_message(self, data):
        message = await self.create_message(
            chat_id=data.get('chat_id'),
            group_id=data.get('group_id'),
            content=data['content'],
            message_type=data.get('message_type', 'text'),
            reply_to_id=data['reply_to_id']
        )
        
        group_name = f"chat_{data['chat_id']}" if 'chat_id' in data else f"group_{data['group_id']}"
        message_type = 'reply_message' if 'chat_id' in data else 'group_reply_message'
        
        await self.broadcast_message(
            group_name=group_name,
            message=message,
            sender_id=self.user.id,
            message_type=message_type
        )

    async def handle_edit_message(self, data):
        message = await self.edit_message(
            message_id=data['message_id'],
            new_content=data['content']
        )

        other_user = await self.get_other_chat_user(data['chat_id'])
        
        await self.channel_layer.group_send(
                f"user_{other_user.id}",
                {
                    'type': 'message_edit',
                    'message_id': message.id,
                    'chat_id': data['chat_id'],
                    'content': message.content,
                    'timestamp': datetime.now().isoformat(),
                }
            )

    async def handle_delete_message(self, data):
        # print("Handling delete message")
        message_id = data['message_id']
        delete_for_everyone = data.get('for_everyone', False)
        chat_id = data.get('chat_id')

        message = await self.get_message(message_id)
        other_user = await self.get_other_chat_user(chat_id)
        # print(f"Other user: {other_user.id} Chat ID: {chat_id}")
        if message.chat:
            # print("Deleting message from chat")
            await self.channel_layer.group_send(
                f"user_{other_user.id}",
                {
                    'type': 'message_delete',
                    'message_id': message.id,
                    'deleted_for_everyone': data.get('for_everyone', False)
                }
            )
        elif message.group:
            await self.channel_layer.group_send(
                f"group_{message.group.id}",
                {
                    'type': 'group_message_delete',
                    'message_id': message.id,
                    'deleted_for_everyone': data.get('for_everyone', False)
                }
            )

        await self.delete_message(
            message_id=data['message_id'],
            delete_for_everyone=data.get('for_everyone', False)
        )

    async def handle_forward_message(self, data):
        message = await self.forward_message(
            original_message_id=data['message_id'],
            chat_id=data.get('chat_id'),
            group_id=data.get('group_id')
        )
        
        if message.chat:
            await self.broadcast_message(
                group_name=f"chat_{message.chat.id}",
                message=message,
                sender_id=self.user.id,
                message_type='chat_message'
            )
        elif message.group:
            await self.broadcast_message(
                group_name=f"group_{message.group.id}",
                message=message,
                sender_id=self.user.id,
                message_type='group_message'
            )
        
    # ===== TYPING INDICATOR HANDLER =====
    async def handle_typing_indicator(self, data):
        try:
            chat_id = data.get('chat_id')
            # group_id = data.get('group_id')
            is_typing = data.get('is_typing', False)

            # if not (chat_id or group_id):
            #     raise ValueError("Missing chat_id or group_id")

            if chat_id:
                # Private chat typing indicator
                # if not await self.is_user_in_chat(chat_id):
                #     raise PermissionError("Not in this chat")
                
                other_user = await self.get_other_chat_user(chat_id)
                await self.channel_layer.group_send(
                    f"user_{other_user.id}",
                    {
                        'type': 'typing_indicator',
                        'chat_id': chat_id,
                        'user_id': self.user.id,
                        'is_typing': is_typing
                    }
                )

        except Exception as e:
            await self.send_error(str(e))

    # ===== READ RECEIPT HANDLER =====
    async def handle_read_receipt(self, data):
        try:
            message_id = data.get('message_id')
            chat_id = data.get('chat_id')
            if not message_id:
                raise ValueError("Missing message_id")
            # print("Handling read receipt")
            message = await self.get_message(message_id)
            # print(f"Message: {message.sender.username}")
            
            if message.chat:
                if not await self.is_user_in_chat(message.chat.id):
                    raise PermissionError("Not in this chat")
            elif message.group:
                if not await self.is_user_in_group(message.group.id):
                    raise PermissionError("Not in this group")
            else:
                raise ValueError("Invalid message context")

            await self.send_delivery_receipt(message_id, self.user.id)
            # await self.mark_message_as_read(message_id)

            # Notify sender that message was read
            if message.sender.id != self.user.id:
                # print({
                    #     'type': 'read_receipt',
                    #     'message_id': message_id,
                    #     'reader_id': self.user.id,
                    #     'timestamp': datetime.now().isoformat(),
                    #     'chat_id': chat_id,
                    # })
                await self.channel_layer.group_send(
                    f"user_{message.sender.id}",
                    {
                        'type': 'read_receipt',
                        'message_id': message_id,
                        'chat_id': chat_id,
                        'reader_id': self.user.id,
                        'timestamp': datetime.now().isoformat(),
                    }
                )

        except Exception as e:
            await self.send_error(str(e))

    # ===== REACTION HANDLER =====
    async def handle_reaction(self, data):
        try:
            message_id = data.get('message_id')
            reaction_type = data.get('reaction_type')
            
            if not message_id or not reaction_type:
                raise ValueError("Missing message_id or reaction_type")

            message = await self.get_message(message_id)
            
            # Verify user has permission to react
            if message.chat:
                if not await self.is_user_in_chat(message.chat.id):
                    raise PermissionError("Not in this chat")
                group_name = f"chat_{message.chat.id}"
            elif message.group:
                if not await self.is_user_in_group(message.group.id):
                    raise PermissionError("Not in this group")
                group_name = f"group_{message.group.id}"
            else:
                raise ValueError("Invalid message context")

            # Add/update reaction
            reaction = await self.set_reaction(message_id, reaction_type)

            # Broadcast reaction update
            await self.channel_layer.group_send(
                group_name,
                {
                    'type': 'reaction_update',
                    'message_id': message_id,
                    'reaction': {
                        'id': reaction.id,
                        'type': reaction.reaction_type,
                        'user_id': self.user.id,
                        'timestamp': reaction.created_at.isoformat()
                    }
                }
            )

        except Exception as e:
            await self.send_error(str(e))

    # ===== CORE FUNCTIONALITY =====
    async def broadcast_message(self, group_name, message, sender_id, message_type):
        # print(f"Broadcasting message to {group_name}: {message.content}")
        await self.channel_layer.group_send(
            group_name,
            {
                'type': message_type,
                'message': await self.message_to_dict(message),
                'sender_id': sender_id
            }
        )

    # ===== DATABASE OPERATIONS =====
    @database_sync_to_async
    def create_message(self, chat_id=None, group_id=None, content='', message_type='text', reply_to_id=None):
        message_data = {
            'sender': self.user,
            'content': content,
            'message_type': message_type
        }
        
        if chat_id:
            message_data['chat'] = Chat.objects.get(id=chat_id)
        elif group_id:
            message_data['group'] = Group.objects.get(id=group_id)
            
        if reply_to_id:
            message_data['reply_to'] = Message.objects.get(id=reply_to_id)
            
        return Message.objects.create(**message_data)

    @database_sync_to_async
    def create_media_message(self, chat_id=None, group_id=None, media_type='image', file_url='', thumbnail_url=None, caption=''):
        message = self.create_message(
            chat_id=chat_id,
            group_id=group_id,
            content=caption,
            message_type=media_type
        )
        
        media = Media.objects.create(
            uploaded_by=self.user,
            message=message,
            media_type=media_type,
            file_url=file_url,
            thumbnail_url=thumbnail_url
        )
        
        return message, media

    @database_sync_to_async
    def edit_message(self, message_id, new_content):
        message = Message.objects.get(id=message_id)
        message.original_text = message.content
        message.content = new_content
        message.is_edited = True
        message.save()
        return message

    @database_sync_to_async
    def delete_message(self, message_id, delete_for_everyone):
        message = Message.objects.get(id=message_id)
        if delete_for_everyone:
            message.is_deleted_for_everyone = True
        else:
            message.deleted_for_users.add(self.user)
        message.save()
        return message

    @database_sync_to_async
    def forward_message(self, original_message_id, chat_id=None, group_id=None):
        original = Message.objects.get(id=original_message_id)
        return self.create_message(
            chat_id=chat_id,
            group_id=group_id,
            content=f"Forwarded: {original.content}",
            message_type=original.message_type,
            reply_to_id=original.id
        )

    @database_sync_to_async
    def mark_user_online(self, online):
        if online:
        # Mark the user as online
            User.objects.filter(id=self.user.id).update(is_online=True)
        else:
            # Mark the user as offline and update the last_seen timestamp
            User.objects.filter(id=self.user.id).update(is_online=False, last_seen=timezone.now())

    @database_sync_to_async
    def get_other_chat_user(self, chat_id):
        chat = Chat.objects.get(id=chat_id)
        return chat.user2 if chat.user1 == self.user else chat.user1

    @database_sync_to_async
    def get_online_group_members(self, group_id):
        return list(Group.objects.get(id=group_id).members.filter(is_online=True))

    @database_sync_to_async
    def is_user_online(self, user_id):
        return User.objects.get(id=user_id).is_online

    @database_sync_to_async
    def send_delivery_receipt(self, message_id, user_id):
        message = Message.objects.get(id=message_id)
        user = User.objects.get(id=user_id)
        message.delivered_to.add(user)
        message.save()

    @database_sync_to_async
    def get_message(self, message_id):
        try:
            return Message.objects.select_related('sender', 'chat', 'group').get(id=message_id)
        except Message.DoesNotExist:
            raise ValueError(f"Message with ID {message_id} does not exist.")
        
    @database_sync_to_async
    def is_user_in_chat(self, chat_id):
        try:
            chat = Chat.objects.get(id=chat_id)
            return self.user in [chat.user1, chat.user2]
        except Chat.DoesNotExist:
            return False
        
    @database_sync_to_async
    def is_user_in_chat(self, chat_id):
        try:
            chat = Chat.objects.get(id=chat_id)
            return self.user in [chat.user1, chat.user2]
        except Chat.DoesNotExist:
            return False
        
    @database_sync_to_async
    def set_reaction(self, message_id, reaction_type):
        message = Message.objects.get(id=message_id)
        reaction, created = Reaction.objects.update_or_create(
            message=message,
            reacted_by=self.user,
            defaults={'reaction_type': reaction_type}
        )
        return reaction

    @database_sync_to_async
    def mark_message_as_read(self, message_id):
        message = Message.objects.get(id=message_id)
        if not message.read_by.filter(id=self.user.id).exists():
            message.read_by.add(self.user)
            message.is_read = True
            message.read_at = timezone.now()
            message.save()

    # ===== SERIALIZERS =====
    @database_sync_to_async
    def message_to_dict(self, message):
        return {
            'id': message.id,
            'sender': {
                'id': message.sender.id,
                'username': message.sender.username,
                'profile_picture': message.sender.profile_picture.url if message.sender.profile_picture else None
            },
            'content': message.content,
            'message_type': message.message_type,
            'timestamp': message.timestamp.isoformat(),
            'is_read': message.is_read,
            'is_edited': message.is_edited,
            'is_forwarded': message.is_forwarded,
            'reply_to': self._serialize_reply(message.reply_to) if message.reply_to else None,
            'original_text': message.original_text if message.is_edited else None
        }

    def _serialize_reply(self, message):
        return {
            'id': message.id,
            'content': message.content,
            'sender_id': message.sender.id,
            'message_type': message.message_type
        }

    @database_sync_to_async
    def media_to_dict(self, media):
        return {
            'id': media.id,
            'type': media.media_type,
            'file_url': media.file_url.url,
            'thumbnail_url': media.thumbnail_url.url if media.thumbnail_url else None
        }

    # ===== WEBSOCKET EVENT HANDLERS =====
    async def chat_message(self, event):
        if event['sender_id'] != self.user.id:
            # print(event)
            await self._send_event('private_message', event)

    async def make_as_read(self, event):
        if event['sender_id'] != self.user.id:
            await self._send_event('make_as_read', event)

    async def message_acknowledgment(self, event):
        if event['sender_id'] == self.user.id:
            await self._send_event('message_acknowledgment', event)
            
    async def group_message(self, event):
        if event['sender_id'] != self.user.id:
            await self._send_event('group_message', event)

    async def media_message(self, event):
        if event['sender_id'] != self.user.id:
            await self._send_event('media_message', event)

    async def reply_message(self, event):
        if event['sender_id'] != self.user.id:
            await self._send_event('reply_message', event)

    async def message_edit(self, event):
        await self._send_event('message_edit', event)

    async def message_delete(self, event):
        await self._send_event('delete_message', event)

    async def _send_event(self, event_type, event):
        await self.send(text_data=json.dumps({
            'type': event_type,
            **{k: v for k, v in event.items() if k != 'type'}
        }))
    
    async def typing_indicator(self, event):
        # print("Typing indicator event:", event)
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'chat_id': event['chat_id'],
            'user_id': event['user_id'],
            'is_typing': event['is_typing']
        }))

    async def audio_call_offer(self, event):
        if event['sender_id'] != self.user.id:
            await self._send_event('audio_call_offer', event)

    async def audio_call_answer(self, event):
        if event['sender_id'] != self.user.id:
            await self._send_event('audio_call_answer', event)

    async def audio_call_ice(self, event):
        if event['sender_id'] != self.user.id:
            await self._send_event('audio_call_ice', event)

    async def audio_call_end(self, event):
        if event['sender_id'] != self.user.id:
            await self._send_event('audio_call_end', event)

    async def group_typing_indicator(self, event):
        await self.send(text_data=json.dumps({
            'type': 'group_typing',
            'group_id': event['group_id'],
            'user_id': event['user_id'],
            'is_typing': event['is_typing']
        }))

    async def read_receipt(self, event):
        await self.send(text_data=json.dumps({
            'type': 'read_receipt',
            'message_id': event['message_id'],
            'reader_id': event['reader_id'],
            'timestamp': event['timestamp'],
            'chat_id': event['chat_id'],
        }))

    async def reaction_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'reaction_update',
            'message_id': event['message_id'],
            'reaction': event['reaction']
        }))

    async def friend_status_update(self, event):
        """
        Handle the friend_status_update event and send it to the WebSocket client.
        """
        await self.send(text_data=json.dumps({
            'type': 'friend_status_update',
            'user_id': event['user_id'],
            'is_online': event['is_online'],
            'last_seen': event.get('last_seen', None)  # Optional field
        }))

    