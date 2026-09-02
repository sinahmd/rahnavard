"""
Custom pagination classes for the Rahnavard API.

StandardResultsPagination:
- Returns {count, next, previous, page_size, results}
- page_size is included so the frontend can derive totalPages
  without hardcoding PAGE_SIZE
- page_size_query_param allows clients to request custom page sizes
- max_page_size prevents abuse
"""

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardResultsPagination(PageNumberPagination):
    """Page-number pagination that includes page_size in the response."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response(
            {
                "count": self.page.paginator.count,
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "page_size": self.get_page_size(self.request) or self.page_size,
                "results": data,
            }
        )
