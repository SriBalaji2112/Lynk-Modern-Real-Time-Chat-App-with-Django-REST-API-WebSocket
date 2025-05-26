from datetime import datetime
from django.db.models import Q
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
# from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser
from .models import Message, Chat, FriendRequest, Media
from django.contrib.auth import get_user_model

# class SignupView(APIView):
#     def post(self, request):
#         username = request.data.get('username')
#         email = request.data.get('email')
#         password = request.data.get('password')

#         if User.objects.filter(username=username).exists():
#             return Response({'error': 'Username already taken'}, status=status.HTTP_400_BAD_REQUEST)

#         user = User.objects.create_user(username=username, email=email, password=password)
#         user.save()

#         refresh = RefreshToken.for_user(user)

#         return Response({
#             'refresh': str(refresh),
#             'access': str(refresh.access_token),
#         }, status=status.HTTP_201_CREATED)

User = get_user_model()  # This gets your custom User model

class SignupView(APIView):
    def post(self, request):
        username = request.data.get('username')
        full_name = request.data.get('name', 'Update your name')
        email = request.data.get('email')
        password = request.data.get('password')

        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already taken'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            username=username,
            full_name=full_name,
            email=email,
            password=password
        )
        user.save()

        return Response({
            'id': user.id,
            'username': user.username,
            'name': user.full_name,
            'email': user.email,
        }, status=status.HTTP_201_CREATED)

class SendFriendRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        receiver_username = request.data.get('username')
        try:
            receiver = User.objects.get(username=receiver_username)
            if receiver == request.user:
                return Response({'error': 'You cannot send a friend request to yourself.'}, status=400)

            # Check if a friend request already exists
            if FriendRequest.objects.filter(sender=request.user, receiver=receiver).exists():
                return Response({'error': 'Friend request already sent.'}, status=400)

            # Create a new friend request
            FriendRequest.objects.create(sender=request.user, receiver=receiver)
            return Response({'message': 'Friend request sent successfully.'}, status=201)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)
        
class AcceptFriendRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request_id = request.data.get('request_id')
        try:
            friend_request = FriendRequest.objects.get(id=request_id, receiver=request.user)
            if friend_request.is_accepted:
                return Response({'error': 'Friend request already accepted.'}, status=400)

            # Accept the friend request
            friend_request.is_accepted = True
            friend_request.save()

            # Add each other as friends
            request.user.friends.add(friend_request.sender)
            friend_request.sender.friends.add(request.user)

            return Response({'message': 'Friend request accepted.'}, status=200)
        except FriendRequest.DoesNotExist:
            return Response({'error': 'Friend request not found.'}, status=404)
        
class RejectFriendRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request_id = request.data.get('request_id')
        try:
            friend_request = FriendRequest.objects.get(id=request_id, receiver=request.user)
            friend_request.delete()
            return Response({'message': 'Friend request rejected.'}, status=200)
        except FriendRequest.DoesNotExist:
            return Response({'error': 'Friend request not found.'}, status=404)
        
class ListFriendsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        friends = request.user.friends.all()
        # print(friends)  # Debugging line to check the friends list
        # data = [{'id': friend.id, 'username': friend.username, 'profile_picture': friend.profile_picture.url if friend.profile_picture else None} for friend in friends]
        data = [{
            'id': user.id,
            'username': user.username,
            'full_name': user.full_name,
            'email': user.email,
            'profile_picture': user.profile_picture.url if user.profile_picture else None,
            'phone_number': user.phone_number,
            'is_online': user.is_online,
            'last_seen': user.last_seen
        } for user in friends]
        #print(f"Friends data: {data}")  # Debugging line to check the data being returned
        return Response(data, status=200)
    
class ListFriendRequestsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        received_requests = FriendRequest.objects.filter(receiver=request.user, is_accepted=False)
        sent_requests = FriendRequest.objects.filter(sender=request.user, is_accepted=False)

        data = {
            'received_requests': [
                {
                    'id': req.id,
                    'username': req.sender.username,
                    'profile_picture': req.sender.profile_picture.url if req.sender.profile_picture else None,
                    'full_name': req.sender.full_name
                }
                for req in received_requests
            ],
            'sent_requests': [
                {
                    'id': req.id,
                    'username': req.sender.username,
                    'profile_picture': req.sender.profile_picture.url if req.sender.profile_picture else None,
                    'full_name': req.sender.full_name
                }
                for req in sent_requests
            ],
        }
        return Response(data, status=200)

class CancelFriendRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request_id = request.data.get('request_id')  # Get the friend request ID from the request
        try:
            # Find the friend request sent by the user
            friend_request = FriendRequest.objects.get(id=request_id, sender=request.user)
            friend_request.delete()  # Delete the friend request
            return Response({'message': 'Friend request canceled successfully.'}, status=200)
        except FriendRequest.DoesNotExist:
            return Response({'error': 'Friend request not found.'}, status=404)

class UnfriendView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        friend_id = request.data.get('friend_id')
        if not friend_id:
            return Response({'error': 'Friend ID is required.'}, status=400)
        try:
            friend = User.objects.get(id=friend_id)
            if friend not in request.user.friends.all():
                return Response({'error': 'This user is not your friend.'}, status=400)

            # Remove each other from the friends list
            request.user.friends.remove(friend)
            friend.friends.remove(request.user)

            return Response({'message': 'Friend removed successfully.'}, status=200)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)
    
class BlockUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        block_username = request.data.get('username')
        try:
            user_to_block = User.objects.get(username=block_username)
            if user_to_block == request.user:
                return Response({'error': 'You cannot block yourself.'}, status=400)

            # Add the user to the blocked_users list
            request.user.blocked_users.add(user_to_block)
            return Response({'message': 'User blocked successfully.'}, status=200)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)
    
class UnblockUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        unblock_username = request.data.get('username')
        try:
            user_to_unblock = User.objects.get(username=unblock_username)
            if user_to_unblock not in request.user.blocked_users.all():
                return Response({'error': 'This user is not blocked.'}, status=400)

            # Remove the user from the blocked_users list
            request.user.blocked_users.remove(user_to_unblock)
            return Response({'message': 'User unblocked successfully.'}, status=200)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)

class UpdateProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request):
        user = request.user  # Get the authenticated user
        username = request.data.get('username')
        full_name = request.data.get('name')
        email = request.data.get('email')
        phone_number = request.data.get('phone_number')
        profile_picture = request.FILES.get('profile_picture')  # Get the uploaded file
        #print(f"Received profile picture: {profile_picture}")
        # Update user details
        if username:
            user.username = username
        if full_name:
            user.full_name = full_name
        if email:
            user.email = email
        if phone_number:
            user.phone_number = phone_number
        if profile_picture:
            user.profile_picture = profile_picture
        user.save()

        return Response({'message': 'Profile updated successfully!'})

    def get(self, request):
        user = request.user
        try:
            profile_picture_url = user.profile_picture.url if user.profile_picture else None
        except (AttributeError, ValueError):
            profile_picture_url = None
            
        return Response({
            'id': user.id,
            'username': user.username,
            'name': user.full_name,
            'email': user.email,
            'profile_picture': profile_picture_url,
            'phone_number': user.phone_number,
            'is_online': user.is_online,
            'last_seen': user.last_seen
        })


class UserSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.GET.get('query', '').strip()  # Get the search query from the request

        if not query:
            return Response({'error': 'Query parameter is required.'}, status=400)

        if query.startswith('@'):  # Search by username
            username = query[1:]  # Remove the '@' symbol
            users = User.objects.filter(username__icontains=username)
        else:  # Search by full name
            users = User.objects.filter(full_name__icontains=query)

        # Serialize the results
        results = [
            {
                'id': user.id,
                'username': user.username,
                'full_name': user.full_name,
                'profile_picture': user.profile_picture.url if user.profile_picture else None,
            }
            for user in users
        ]
        #print(f"Search results: {results}")  # Debugging line to check the results

        return Response(results, status=200)
    
class ChatListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        chats = Chat.objects.filter(Q(user1=user) | Q(user2=user))
        data = []
        for chat in chats:
            last_message = chat.messages.filter(
                is_deleted_for_everyone=False  # Exclude messages deleted for everyone
            ).exclude(
                deleted_for_users=user  # Exclude messages deleted for the current user
            ).order_by('-timestamp').first()
            if last_message:
                if last_message.message_type in ['audio', 'image', 'video', 'file']:
                    last_message_content = f"{last_message.message_type.lower()}"
                else:
                    last_message_content = last_message.content
            else:
                last_message_content = ''

            # Handle cases where profile_picture is None or has no file
            other_user = chat.user2 if chat.user1 == user else chat.user1
            profile_picture_url = (
                other_user.profile_picture.url if other_user.profile_picture else None
            )

            data.append({
                'id': chat.id,
                'name': chat.user2.full_name if chat.user1 == user else chat.user1.full_name,
                'username': chat.user2.username if chat.user1 == user else chat.user1.username,
                'is_online': chat.user2.is_online if chat.user1 == user else chat.user1.is_online,
                'last_seen': chat.user2.last_seen if chat.user1 == user else chat.user1.last_seen,
                'profile_picture': profile_picture_url,
                'last_message': last_message_content,
                'timestamp': last_message.timestamp if last_message else None
            })
        return Response(data)
    
class ChatMessagesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, chat_id):
        try:
            chat = Chat.objects.get(id=chat_id)
            if request.user not in [chat.user1, chat.user2]:
                return Response({'error': 'Not authorized'}, status=403)
                
            messages = chat.messages.all().order_by('timestamp')
            data = []
            for msg in messages:
                if msg.message_type in ['audio', 'image', 'video', 'file']:
                    message_data = {
                        'id': msg.id,
                        'sender': msg.sender.username,
                        'content': f"[{msg.message_type.upper()}]",
                        'media_url': msg.media.file_url.url if msg.media else None,
                        'thumbnail_url': msg.media.thumbnail_url if msg.media and msg.media.thumbnail_url else None,
                        'timestamp': msg.timestamp,
                        'is_me': msg.sender == request.user,
                        'media_type': msg.message_type,
                    }
                    #print(f"Media message data: {message_data}")  # Debugging line to check media message data
                else:
                    message_data = {
                        'id': msg.id,
                        'sender': msg.sender.username,
                        'content': msg.content,
                        'timestamp': msg.timestamp,
                        'is_me': msg.sender == request.user
                    }
                data.append(message_data)
            return Response(data)
        except Chat.DoesNotExist:
            return Response({'error': 'Chat not found'}, status=404)
        
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Chat, Message
from .serializers import MessageSerializer
from rest_framework.pagination import PageNumberPagination

class ChatMessagePagination(PageNumberPagination):
    page_size = 20  # Default number of messages per page
    page_size_query_param = 'page_size'  # Allow the client to set the page size
    max_page_size = 100  # Maximum number of messages per page

# @api_view(['GET'])
# def get_chat_messages(request, chat_id):
#     try:
#         chat = Chat.objects.get(id=chat_id)
#         messages = Message.objects.filter(chat=chat).order_by('timestamp')
#         serializer = MessageSerializer(messages, many=True)
#         # print(serializer.data)  # Debugging line to check serialized data
#         return Response(serializer.data)
#     except Chat.DoesNotExist:
#         return Response({'error': 'Chat not found'}, status=404)

@api_view(['GET'])
def get_chat_messages(request, chat_id):
    try:
        chat = Chat.objects.get(id=chat_id)
        messages = Message.objects.filter(chat=chat, is_deleted_for_everyone=False).exclude(
            deleted_for_users=request.user).order_by('-timestamp')  # Order by latest messages first

        # Apply pagination
        paginator = ChatMessagePagination()
        paginated_messages = paginator.paginate_queryset(messages, request)

        # Serialize the paginated messages
        serializer = MessageSerializer(paginated_messages, many=True)

        return paginator.get_paginated_response(serializer.data)
    except Chat.DoesNotExist:
        return Response({'error': 'Chat not found'}, status=404)
    
from moviepy import VideoFileClip
from django.conf import settings
import os

class MediaUploadView(APIView):
    parser_classes = [MultiPartParser]
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        chat_id = request.data.get('chat_id')
        media_type = request.data.get('media_type', 'file')
        file = request.FILES.get('file')

        if not (chat_id and file):
            return Response({"error": "Missing chat_id or file"}, status=400)

        try:
            chat = Chat.objects.get(id=chat_id)

            thumbnail_url = None
            if media_type == 'video':
                thumbnail_url = self.generate_video_thumbnail(file)

            media = Media.objects.create(
                uploaded_by=request.user,
                media_type=media_type,
                file_url=file,
                thumbnail_url=thumbnail_url
            )

            media.save()

            # Save the media message
            message = Message.objects.create(
                chat=chat,
                media=media,
                sender=request.user,
                message_type=media_type,
                content=file.name,  # Media messages may not have text content
            )

            message.save()

            serialized_message = MessageSerializer(message).data

            return Response({
                "id": message.id,
                "message": serialized_message,
                "message_type": media_type,
                "media_url": media.file_url.url,
                "media_type": media.media_type,
                "thumbnail_url": thumbnail_url,
                "timestamp": media.uploaded_at,
            }, status=201)

        except Chat.DoesNotExist:
            return Response({"error": "Chat not found"}, status=404)

    def generate_video_thumbnail(self, file):
        """
        Generate a thumbnail for the uploaded video file.
        """
        try:
            # Save the uploaded video temporarily
            video_path = os.path.join(settings.MEDIA_ROOT, 'temp', file.name)
            os.makedirs(os.path.dirname(video_path), exist_ok=True)
            with open(video_path, 'wb') as temp_file:
                for chunk in file.chunks():
                    temp_file.write(chunk)

            # Use moviepy to extract a frame
            thumbnail_path = os.path.join(settings.MEDIA_ROOT, 'thumbnails', f"thumb_{file.name}.jpg")
            os.makedirs(os.path.dirname(thumbnail_path), exist_ok=True)
            with VideoFileClip(video_path) as clip:
                clip.save_frame(thumbnail_path, t=1.0)  # Extract frame at 1 second

            # Clean up the temporary video file
            os.remove(video_path)

            # Return the thumbnail URL
            return f"{settings.MEDIA_URL}thumbnails/thumb_{file.name}.jpg"
        except Exception as e:
            print(f"Error generating thumbnail: {e}")
            return None
        
class ReplyMessageView(APIView):
    def post(self, request):
        reply_to_id = request.data.get("reply_to_id")
        message = Message.objects.create(
            chat_id=request.data["chat_id"],
            sender=request.user,
            text_content=request.data["text_content"],
            reply_to_id=reply_to_id
        )
        return Response({"id": message.id})

class ForwardMessageView(APIView):
    def post(self, request):
        original = Message.objects.get(id=request.data["message_id"])
        for chat_id in request.data["chat_ids"]:
            Message.objects.create(
                chat_id=chat_id,
                sender=request.user,
                text_content=original.text_content,
                media_file=original.media_file,
                message_type=original.message_type,
                is_forwarded=True
            )
        return Response({"status": "forwarded"})


class SearchMessagesView(APIView):
    def get(self, request):
        keyword = request.GET.get('keyword', None)
        date = request.GET.get('date', None)  # Expect format YYYY-MM-DD
        
        # Start the query
        query = Q()

        if keyword:
            query &= Q(text_content__icontains=keyword)  # Case-insensitive search by text

        if date:
            try:
                search_date = datetime.strptime(date, '%Y-%m-%d').date()
                query &= Q(timestamp__date=search_date)  # Search by exact date
            except ValueError:
                return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)

        messages = Message.objects.filter(query)

        # Serialize messages to return as response
        results = [{"sender": message.sender.username, "text": message.text_content, "timestamp": message.timestamp} for message in messages]
        
        return Response(results)

class StartChatView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        other_username = request.data.get('username')  # The other user's username
        
        try:
            other_user = User.objects.get(username=other_username)
            
            # Check if chat already exists
            chat = Chat.objects.filter(
                Q(user1=request.user, user2=other_user) | 
                Q(user1=other_user, user2=request.user)
            ).first()
            
            if not chat:
                chat = Chat.objects.create(
                    user1=request.user,
                    user2=other_user
                )
            
            return Response({
                'chat_id': chat.id,
                'other_user': {
                    'receiver_id': other_user.id,
                    'username': other_user.username,
                    'profile_picture': other_user.profile_picture.url if other_user.profile_picture else None
                }
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
class LogoutView(APIView):
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh_token')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()  # Add to blacklist
            return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)