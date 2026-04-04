from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from lostfound.models import User
from lostfound.serializers import (
    CustomTokenSerializer,
    RegisterSerializer,
    UserProfileSerializer,
)


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class   = CustomTokenSerializer


class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class   = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Registrasi berhasil.',
            'user':    UserProfileSerializer(user, context={'request': request}).data,
            'tokens': {
                'refresh': str(refresh),
                'access':  str(refresh.access_token),
            },
        }, status=status.HTTP_201_CREATED)


class ProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class   = UserProfileSerializer
    parser_classes     = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        return self.request.user


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            RefreshToken(request.data['refresh']).blacklist()
        except Exception:
            pass
        return Response({'message': 'Logout berhasil.'})
