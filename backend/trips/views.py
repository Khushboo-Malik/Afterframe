from django.db import connection
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from . import rate_limit, repo, services
from .serializers import (
    ErrorOutSerializer,
    GridOutSerializer,
    LimitsOutSerializer,
    SubmitInSerializer,
    SubmitOutSerializer,
    TripOutSerializer,
    VideoOutSerializer,
)

MAX_QUERY_CHARS = 100


def _error(err: services.ApiError) -> Response:
    return Response({"code": err.code, "message": err.message}, status=err.http)


class VideoListCreateView(APIView):
    @extend_schema(
        operation_id="videos_list",
        summary="Home grid: mapped trips, newest first",
        parameters=[
            OpenApiParameter("page", int, description="1-based page (24 per page)"),
            OpenApiParameter("q", str, description="Filter by title"),
        ],
        responses=GridOutSerializer,
    )
    def get(self, request):
        raw_page = request.query_params.get("page", "1")
        page = int(raw_page) if raw_page.isdigit() and int(raw_page) > 0 else 1
        q = request.query_params.get("q", "").strip()[:MAX_QUERY_CHARS]
        videos, has_more = repo.list_grid(page, q)
        return Response({"results": VideoOutSerializer(videos, many=True).data, "has_more": has_more})

    @extend_schema(
        operation_id="videos_submit",
        summary="Submit a YouTube link to map",
        request=SubmitInSerializer,
        responses={
            200: OpenApiResponse(SubmitOutSerializer, description="Already mapped"),
            202: OpenApiResponse(SubmitOutSerializer, description="Mapping (now or already)"),
            **{
                http: OpenApiResponse(ErrorOutSerializer, description=code)
                for code, (http, _msg) in services.ERRORS.items()
            },
        },
    )
    def post(self, request):
        url = request.data.get("url") if isinstance(request.data, dict) else None
        result = services.submit_video(url)
        if isinstance(result, services.ApiError):
            return _error(result)
        return Response({"video_key": result.video_key, "status": result.status}, status=result.http)


class VideoDetailView(APIView):
    @extend_schema(
        operation_id="videos_get",
        summary="One trip: the video and its places (ordered by ord)",
        responses={200: TripOutSerializer, 404: ErrorOutSerializer},
    )
    def get(self, request, key: str):
        trip = repo.get_trip(key)
        if trip is None:
            return _error(services.api_error("not_found"))
        return Response(TripOutSerializer(trip).data)


@extend_schema(
    operation_id="limits_get",
    summary="Today's site-wide free mapping slots (resets at midnight UTC)",
    responses={200: LimitsOutSerializer, 503: ErrorOutSerializer},
)
@api_view(["GET"])
def limits(request):
    status = rate_limit.status()
    if status is None:
        return _error(services.api_error("busy"))
    return Response(status)


@extend_schema(exclude=True)
@api_view(["GET"])
@throttle_classes([])
def healthz(request):
    """Liveness: no DB, no Redis."""
    return Response({"ok": True})


@extend_schema(exclude=True)
@api_view(["GET"])
@throttle_classes([])
def healthz_db(request):
    """DB check (also the Supabase keep-alive target)."""
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        cursor.fetchone()
    return Response({"ok": True})
