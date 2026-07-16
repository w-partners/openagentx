-- 008: entity_changes payload 포맷을 Star 합의 표준으로 정렬
-- 변경: {table, op:대문자, id, user_id, agent_id, ts}
--   → {entity_type, entity_id, op:소문자, source:'cryptointel-marketplace', user_id, agent_id, ts}

CREATE OR REPLACE FUNCTION public.notify_entity_change()
  RETURNS trigger
  LANGUAGE plpgsql
AS $function$
DECLARE
  payload JSONB;
  rec     JSONB;
  ent_id  TEXT;
BEGIN
  rec := COALESCE(to_jsonb(NEW), to_jsonb(OLD));

  -- favorites 처럼 단일 id가 없는 테이블은 user_id||agent_id 조합으로 entity_id 생성
  ent_id := rec->>'id';
  IF ent_id IS NULL THEN
    ent_id := COALESCE(rec->>'user_id', '') || ':' || COALESCE(rec->>'agent_id', '');
  END IF;

  payload := jsonb_build_object(
    'entity_type', TG_TABLE_NAME,
    'entity_id',   ent_id,
    'op',          LOWER(TG_OP),
    'source',      'cryptointel-marketplace',
    'user_id',     rec->'user_id',
    'agent_id',    rec->'agent_id',
    'ts',          extract(epoch from now())
  );
  PERFORM pg_notify('entity_changes', payload::text);
  RETURN COALESCE(NEW, OLD);
END;
$function$;
