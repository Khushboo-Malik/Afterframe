from django.db import connection
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response


@api_view(["GET"])
@throttle_classes([])
def healthz(request):
    """Liveness: no DB, no Redis."""
    return Response({"ok": True})


@api_view(["GET"])
@throttle_classes([])
def healthz_db(request):
    """DB check (also the Supabase keep-alive target)."""
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        cursor.fetchone()
    return Response({"ok": True})
