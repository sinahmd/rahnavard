from rest_framework import generics
from .models import Branch
from .serializers import BranchSerializer, BranchAdminSerializer


class BranchListView(generics.ListAPIView):
    """Public endpoint for listing active branches."""
    serializer_class = BranchSerializer

    def get_queryset(self):
        return Branch.objects.filter(is_active=True)


class BranchAdminListView(generics.ListCreateAPIView):
    """Admin endpoint for listing and creating branches."""
    serializer_class = BranchAdminSerializer
    queryset = Branch.objects.all()


class BranchAdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin endpoint for branch detail, update, and delete."""
    serializer_class = BranchAdminSerializer
    queryset = Branch.objects.all()
