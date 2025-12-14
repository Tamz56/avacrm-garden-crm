-- Create the storage bucket 'tree-images'
insert into storage.buckets (id, name, public)
values ('tree-images', 'tree-images', true)
on conflict (id) do nothing;

-- Set up security policies for the bucket
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'tree-images' );

create policy "Authenticated Upload"
  on storage.objects for insert
  with check ( bucket_id = 'tree-images' and auth.role() = 'authenticated' );

create policy "Authenticated Update"
  on storage.objects for update
  using ( bucket_id = 'tree-images' and auth.role() = 'authenticated' );

create policy "Authenticated Delete"
  on storage.objects for delete
  using ( bucket_id = 'tree-images' and auth.role() = 'authenticated' );
