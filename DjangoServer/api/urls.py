from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import (SignupView, UpdateProfileView, MediaUploadView, get_chat_messages, ChatMessagesView, SearchMessagesView, StartChatView, ChatListView, LogoutView,
                    SendFriendRequestView,
    AcceptFriendRequestView,
    RejectFriendRequestView,
    ListFriendsView,
    ListFriendRequestsView,
    UnfriendView,
    BlockUserView,
    UnblockUserView,
    UserSearchView,
    CancelFriendRequestView,)

urlpatterns = [
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),  

    path('signup/', SignupView.as_view(), name='signup'),
    path('user/profile/', UpdateProfileView.as_view(), name='update_profile'),
    path('search/users/', UserSearchView.as_view(), name='user-search'),

    path('friends/send-request/', SendFriendRequestView.as_view(), name='send-friend-request'),
    path('friends/accept-request/', AcceptFriendRequestView.as_view(), name='accept-friend-request'),
    path('friends/reject-request/', RejectFriendRequestView.as_view(), name='reject-friend-request'),
    path('friends/list/', ListFriendsView.as_view(), name='list-friends'),
    path('friends/requests/', ListFriendRequestsView.as_view(), name='list-friend-requests'),
    path('friends/unfriend/', UnfriendView.as_view(), name='unfriend'),
    path('friends/cancel-request/', CancelFriendRequestView.as_view(), name='cancel-friend-request'),
    path('users/block/', BlockUserView.as_view(), name='block-user'),
    path('users/unblock/', UnblockUserView.as_view(), name='unblock-user'),
    
    path('chats/', ChatListView.as_view(), name='chat-list'),

    path('chats/start/', StartChatView.as_view(), name='start-chat'),

    # path('chats/<int:chat_id>/messages/', ChatMessagesView.as_view(), name='chat-messages'),
    path('chats/<int:chat_id>/messages/', get_chat_messages, name='chat-messages'),

    path('chat/media-upload/', MediaUploadView.as_view(), name='media-upload'),

    path('search_messages/', SearchMessagesView.as_view(), name='search_messages'),

    path('auth/logout/', LogoutView.as_view(), name='logout'),
    
]
