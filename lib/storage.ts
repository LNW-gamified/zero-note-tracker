import { supabase } from "./supabase";

export async function uploadPhoto(file: File, folder: string): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("catalog-photos")
    .upload(path, file, { upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from("catalog-photos").getPublicUrl(path);
  return data.publicUrl;
}
