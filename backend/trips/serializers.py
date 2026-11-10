"""JSON shapes from the API contract (00-overview.md). snake_case end to end."""

from rest_framework import serializers

from .models import Place, Video


class VideoOutSerializer(serializers.ModelSerializer):
    video_id = serializers.CharField(read_only=True)

    class Meta:
        model = Video
        fields = [
            "key", "platform", "url", "video_id", "title", "channel", "duration_sec",
            "thumbnail_url", "status", "stage", "error_code", "place_count", "created_at",
        ]


class PlaceOutSerializer(serializers.ModelSerializer):
    maps_url = serializers.CharField(read_only=True, allow_null=True)

    class Meta:
        model = Place
        fields = [
            "id", "ord", "name", "category", "timestamp_sec", "description", "verification",
            "match_score", "place_id", "lat", "lng", "address", "maps_url",
        ]


class TripOutSerializer(serializers.Serializer):
    video = VideoOutSerializer()
    places = PlaceOutSerializer(many=True)
    stale = serializers.BooleanField()


class GridOutSerializer(serializers.Serializer):
    results = VideoOutSerializer(many=True)
    has_more = serializers.BooleanField()


class SubmitInSerializer(serializers.Serializer):
    url = serializers.CharField()


class SubmitOutSerializer(serializers.Serializer):
    video_key = serializers.CharField()
    status = serializers.ChoiceField(choices=["done", "partial", "processing"])


class ErrorOutSerializer(serializers.Serializer):
    code = serializers.CharField()
    message = serializers.CharField()
