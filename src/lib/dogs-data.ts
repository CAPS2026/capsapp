import { createClient } from "@/lib/supabase/server";
import type { DogListItem, DogStatus, OrgSettings, StatusMeta } from "@/lib/dogs";

type ActivityRow = {
  id: string;
  type: string;
  started_at: string;
  due_back: string | null;
  reason: string | null;
  person: { id: string; first_name: string; surname: string } | null;
};

export async function getDogsListData() {
  const supabase = await createClient();

  const [{ data: statusRows }, { data: settingsRow }, { data: dogRows }] = await Promise.all([
    supabase.from("dog_statuses").select("code, label, sort_order, is_out").order("sort_order"),
    supabase
      .from("org_settings")
      .select("walk_alert_after_minutes, yard_alert_after_minutes, needs_walk_after_days")
      .single(),
    supabase
      .from("dogs")
      .select("id, ref, name, status, experienced_handler_only, current_activity_id, latest_walk_id")
      .neq("status", "exited"),
  ]);

  const dogs = dogRows ?? [];

  const activityIds = Array.from(
    new Set(
      dogs.flatMap((d) => [d.current_activity_id, d.latest_walk_id]).filter((id): id is string => !!id),
    ),
  );

  const { data: activityRows } = activityIds.length
    ? await supabase
        .from("dog_activity")
        .select(
          "id, type, started_at, due_back, reason, person:people!dog_activity_person_id_fkey(id, first_name, surname)",
        )
        .in("id", activityIds)
    : { data: [] as ActivityRow[] };

  const activityById = new Map<string, ActivityRow>(
    ((activityRows ?? []) as unknown as ActivityRow[]).map((a) => [a.id, a]),
  );

  const dogIds = dogs.map((d) => d.id);
  const { data: mediaRows } = dogIds.length
    ? await supabase.from("dog_media").select("dog_id, path, is_primary").in("dog_id", dogIds)
    : { data: [] as { dog_id: string; path: string; is_primary: boolean }[] };

  const photoPathByDog = new Map<string, string>();
  for (const m of mediaRows ?? []) {
    if (m.is_primary || !photoPathByDog.has(m.dog_id)) photoPathByDog.set(m.dog_id, m.path);
  }

  const items: DogListItem[] = dogs.map((d) => {
    const currentRow = d.current_activity_id ? activityById.get(d.current_activity_id) : undefined;
    const lastWalkRow = d.latest_walk_id ? activityById.get(d.latest_walk_id) : undefined;
    const photoPath = photoPathByDog.get(d.id);

    return {
      id: d.id,
      ref: d.ref,
      name: d.name,
      status: d.status as DogStatus,
      experiencedHandlerOnly: d.experienced_handler_only,
      photoUrl: photoPath ? supabase.storage.from("dog-photos").getPublicUrl(photoPath).data.publicUrl : null,
      current: currentRow
        ? {
            type: currentRow.type,
            personId: currentRow.person?.id ?? null,
            personName: currentRow.person ? `${currentRow.person.first_name} ${currentRow.person.surname}` : null,
            startedAt: currentRow.started_at,
            dueBack: currentRow.due_back,
            reason: currentRow.reason,
          }
        : null,
      lastWalkAt: lastWalkRow?.started_at ?? null,
    };
  });

  const statusMeta: StatusMeta[] = (statusRows ?? [])
    .filter((s) => s.code !== "exited")
    .map((s) => ({ code: s.code as DogStatus, label: s.label, sortOrder: s.sort_order, isOut: s.is_out }));

  const orgSettings: OrgSettings = {
    walkAlertAfterMinutes: settingsRow?.walk_alert_after_minutes ?? 60,
    yardAlertAfterMinutes: settingsRow?.yard_alert_after_minutes ?? 120,
    needsWalkAfterDays: settingsRow?.needs_walk_after_days ?? 3,
  };

  return { dogs: items, statusMeta, orgSettings };
}
