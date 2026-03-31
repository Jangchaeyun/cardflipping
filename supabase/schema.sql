-- 테이블 card_flip_scores 는 대시보드에서 이미 만든 상태라고 가정합니다.
-- INSERT/SELECT 가 막혀 있으면 아래 RLS 정책을 SQL Editor 에서 실행하세요.

alter table public.card_flip_scores enable row level security;

drop policy if exists "card_flip_scores_select_all" on public.card_flip_scores;
drop policy if exists "card_flip_scores_insert_all" on public.card_flip_scores;

create policy "card_flip_scores_select_all"
  on public.card_flip_scores for select
  to anon, authenticated
  using (true);

create policy "card_flip_scores_insert_all"
  on public.card_flip_scores for insert
  to anon, authenticated
  with check (true);

-- 실시간 리더보드(브라우저 postgres_changes)용: 이미 등록된 경우 오류가 나면 무시해도 됩니다.
alter publication supabase_realtime add table public.card_flip_scores;
