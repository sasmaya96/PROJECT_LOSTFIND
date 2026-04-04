from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from urllib.parse import parse_qs


class JWTAuthMiddleware(BaseMiddleware):
    """
    Middleware WebSocket yang membaca JWT dari query param ?token=<access_token>
    Contoh koneksi: ws://localhost:8000/ws/chat/1/?token=eyJ...
    """

    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode()
        params       = parse_qs(query_string)
        token_list   = params.get('token', [])

        if token_list:
            scope['user'] = await self._get_user(token_list[0])
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def _get_user(self, token_str):
        from rest_framework_simplejwt.tokens import AccessToken
        from rest_framework_simplejwt.exceptions import TokenError
        from lostfound.models import User

        try:
            token   = AccessToken(token_str)
            user_id = token['user_id']
            return User.objects.get(id=user_id, is_active=True)
        except (TokenError, User.DoesNotExist, KeyError):
            return AnonymousUser()
