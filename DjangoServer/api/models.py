from django.db import models
from django.contrib.auth.models import AbstractUser, Group, Permission

# User model
class User(AbstractUser):
    full_name = models.CharField(max_length=255, blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_typing_to = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='typing_users')
    
    # Add these to resolve conflicts
    groups = models.ManyToManyField(
        Group,
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.',
        related_name="custom_user_groups",  # Changed
        related_query_name="custom_user",
    )
    user_permissions = models.ManyToManyField(
        Permission,
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name="custom_user_permissions",  # Changed
        related_query_name="custom_user",
    )

    def __str__(self):
        return self.username

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class FriendRequest(models.Model):
    sender = models.ForeignKey(User, related_name='sent_friend_requests', on_delete=models.CASCADE)
    receiver = models.ForeignKey(User, related_name='received_friend_requests', on_delete=models.CASCADE)
    is_accepted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender.username} -> {self.receiver.username} ({'Accepted' if self.is_accepted else 'Pending'})"

# Add a ManyToManyField for friends in the User model
User.add_to_class('friends', models.ManyToManyField('self', symmetrical=True, blank=True))
User.add_to_class('blocked_users', models.ManyToManyField('self', symmetrical=False, blank=True, related_name='blocked_by'))

# Private chat model
class Chat(models.Model):
    user1 = models.ForeignKey(User, related_name='chat_user1', on_delete=models.CASCADE)
    user2 = models.ForeignKey(User, related_name='chat_user2', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_blocked = models.BooleanField(default=False)

    def __str__(self):
        return f"Chat between {self.user1.username} and {self.user2.username}"


# Group chat model
class Group(models.Model):
    name = models.CharField(max_length=255)
    admins = models.ForeignKey(User, related_name='group_admin', on_delete=models.CASCADE)
    group_picture = models.ImageField(upload_to='group_pictures/', null=True, blank=True)
    members = models.ManyToManyField(User, related_name='groups')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_private = models.BooleanField(default=True)  # Private by default

    members = models.ManyToManyField(
        User, 
        related_name='group_memberships',  # Changed from 'groups'
        related_query_name='group_member'
    )
    
    def __str__(self):
        return self.name

# Media model
class Media(models.Model):
    MEDIA_TYPES = [
        ('image', 'Image'),
        ('video', 'Video'),
        ('audio', 'Audio'),
        ('file', 'File'),
    ]

    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    media_type = models.CharField(max_length=10, choices=MEDIA_TYPES)
    file_url = models.FileField(upload_to='media_files/')
    thumbnail_url = models.ImageField(upload_to='thumbnails/', null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Media uploaded by {self.uploaded_by.username}"

# Message model
class Message(models.Model):
    MESSAGE_TYPES = [
        ('text', 'Text'),
        ('image', 'Image'),
        ('video', 'Video'),
        ('audio', 'Audio'),
        ('file', 'File'),
        ('reaction', 'Reaction'),
    ]

    chat = models.ForeignKey(Chat, related_name='messages', on_delete=models.CASCADE, null=True, blank=True)
    group = models.ForeignKey(Group, related_name='messages', on_delete=models.CASCADE, null=True, blank=True)
    sender = models.ForeignKey(User, related_name='sent_messages', on_delete=models.CASCADE)
    message_type = models.CharField(max_length=10, choices=MESSAGE_TYPES)
    content = models.TextField()
    media = models.ForeignKey(Media, related_name='messages', on_delete=models.CASCADE, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    is_edited = models.BooleanField(default=False)
    edited_at = models.DateTimeField(null=True, blank=True)
    reply_to = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='replies')
    is_deleted = models.BooleanField(default=False)
    read_by = models.ManyToManyField(User, related_name='read_messages', blank=True)  # NEW
    is_deleted_for_everyone = models.BooleanField(default=False)
    deleted_for_users = models.ManyToManyField(User, related_name='deleted_messages', blank=True)
    is_forwarded = models.BooleanField(default=False)
    delivered_to = models.ManyToManyField(User, related_name="delivered_messages", blank=True)
    original_text = models.TextField(null=True, blank=True)  # Store original message text

    def __str__(self):
        return f"Message from {self.sender.username}"

    def is_read_by(self, user):
        return self.read_by.filter(id=user.id).exists()




# Blocked Users
class BlockedUser(models.Model):
    blocker = models.ForeignKey(User, related_name='blocker', on_delete=models.CASCADE)
    blocked = models.ForeignKey(User, related_name='blocked', on_delete=models.CASCADE)
    blocked_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.blocker.username} blocked {self.blocked.username}"


# Notifications
class Notification(models.Model):
    user = models.ForeignKey(User, related_name='notifications', on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    body = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notification for {self.user.username}"


# Message Reactions
class Reaction(models.Model):
    message = models.ForeignKey(Message, related_name='reactions', on_delete=models.CASCADE)
    reacted_by = models.ForeignKey(User, related_name='reactions', on_delete=models.CASCADE)
    reaction_type = models.CharField(max_length=10)  # emoji type

    def __str__(self):
        return f"{self.reacted_by.username} reacted to message {self.message.id}"


# Story / Status model
class Story(models.Model):
    user = models.ForeignKey(User, related_name='stories', on_delete=models.CASCADE)
    caption = models.CharField(max_length=255, null=True, blank=True)
    media = models.FileField(upload_to='stories/')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def __str__(self):
        return f"{self.user.username}'s Story"
