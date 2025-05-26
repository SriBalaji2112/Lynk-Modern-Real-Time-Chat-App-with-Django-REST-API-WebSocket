from django.urls import re_path
from api.consumers import ChatConsumer  # adjust path if needed

websocket_urlpatterns = [
    re_path(r'ws/socket-server/$', ChatConsumer.as_asgi()),
]
