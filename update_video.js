import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kxutigbuhsrmrzodmlvg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_bp1Zm5uNM0L9fGeDTaX44w_hKsAX8jq';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function updateVideo() {
  const { data, error } = await supabase
    .from('recipes')
    .update({ video_url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' })
    .eq('id', '5285d0fc-a829-4f59-91f5-56025f21f29d');
  
  if (error) console.error(error);
  else console.log('Updated successfully');
}

updateVideo();
