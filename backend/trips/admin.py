"""Owner-only admin: choose which trips are listed (Featured) and hide unsuitable ones."""

from django.contrib import admin

from .models import Place, Video


class PlaceInline(admin.TabularInline):
    model = Place
    fields = (
        "ord", "name", "category", "timestamp_sec", "verification",
        "match_score", "resolved_by", "address",
    )
    readonly_fields = fields
    extra = 0
    can_delete = False
    show_change_link = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ("title", "status", "place_count", "is_featured", "is_hidden", "created_at")
    list_editable = ("is_featured", "is_hidden")
    list_filter = ("status", "is_featured", "is_hidden", "platform")
    search_fields = ("title",)
    ordering = ("-created_at",)
    inlines = [PlaceInline]
    readonly_fields = [f.name for f in Video._meta.fields if f.name not in ("is_hidden", "is_featured")]

    def has_add_permission(self, request):
        return False  # videos come from the API only

    def save_model(self, request, obj, form, change):
        # Write only the two owner flags, so a save never overwrites what a running job
        # is updating (status, stage, place_count, updated_at...).
        obj.save(update_fields=["is_hidden", "is_featured"])
