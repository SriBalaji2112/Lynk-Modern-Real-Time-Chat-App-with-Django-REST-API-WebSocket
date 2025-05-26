from rest_framework import serializers
from .models import Message, Media

class MediaSerializer(serializers.ModelSerializer):
    thumbnail_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Media
        fields = ['id', 'media_type', 'file_url', 'thumbnail_url', 'uploaded_at']
    
    def get_thumbnail_url(self, obj):
        """
        Return the relative path for the thumbnail_url field.
        """
        if obj.thumbnail_url:
            print("Thumbnail URL:", obj.thumbnail_url.url)
            return obj.thumbnail_url.name  # Returns the relative path
        return None

class MessageReplySerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = [
            'id', 'message_type', 'content', 'timestamp', 'sender'
        ]

class MessageSerializer(serializers.ModelSerializer):
    media = MediaSerializer()
    reply_to = MessageReplySerializer(read_only=True)

    class Meta:
        model = Message
        fields = [
            'id', 'message_type', 'content', 'timestamp', 'is_read', 'read_at',
            'is_edited', 'edited_at', 'is_deleted', 'is_deleted_for_everyone',
            'is_forwarded', 'original_text', 'chat', 'group', 'sender', 'media',
            'reply_to', 'read_by', 'deleted_for_users', 'delivered_to'
        ]
