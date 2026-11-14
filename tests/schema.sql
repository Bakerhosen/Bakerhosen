-- Run after the migration in a disposable database: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/schema.sql
begin;
insert into plans(id,title,organizer_hash) values(repeat('a',32),'Test A',repeat('c',64)),(repeat('b',32),'Test B',repeat('d',64));
insert into options(id,plan_id,place,starts_at) values('11111111-1111-4111-8111-111111111111',repeat('a',32),'First',now()),('22222222-2222-4222-8222-222222222222',repeat('a',32),'Second',now());
insert into votes(plan_id,participant_id,nickname,option_id) values(repeat('a',32),'33333333-3333-4333-8333-333333333333','Alex','11111111-1111-4111-8111-111111111111');
insert into votes(plan_id,participant_id,nickname,option_id) values(repeat('a',32),'33333333-3333-4333-8333-333333333333','Alex','22222222-2222-4222-8222-222222222222') on conflict(plan_id,participant_id) do update set option_id=excluded.option_id;
do $$ begin
 if (select count(*) from votes where plan_id=repeat('a',32)) <> 1 then raise exception 'Vote upsert increased total'; end if;
 begin
  insert into votes values(repeat('a',32),'33333333-3333-4333-8333-333333333333','Alex','11111111-1111-4111-8111-111111111111');
  raise exception 'Duplicate participant accepted';
 exception when unique_violation then null; end;
 begin
  insert into votes values(repeat('b',32),'33333333-3333-4333-8333-333333333333','Alex','11111111-1111-4111-8111-111111111111');
  raise exception 'Cross-plan vote accepted';
 exception when foreign_key_violation then null; end;
 begin
  update plans set confirmed_option_id='11111111-1111-4111-8111-111111111111' where id=repeat('b',32);
  raise exception 'Cross-plan confirmation accepted';
 exception when foreign_key_violation then null; end;
end $$;
set local role anon;
do $$ begin
 begin perform * from public.plans; raise exception 'Anonymous read accepted'; exception when insufficient_privilege then null; end;
 begin insert into public.plans(id,title,organizer_hash) values(repeat('e',32),'Forbidden','hash'); raise exception 'Anonymous write accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
do $$ begin
 begin perform * from public.options; raise exception 'Authenticated read accepted'; exception when insufficient_privilege then null; end;
 begin delete from public.votes; raise exception 'Authenticated write accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
