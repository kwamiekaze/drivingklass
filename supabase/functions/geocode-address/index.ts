import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'DrivingKlass/1.0' }
    });
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { student_id, geocode_all } = await req.json();

    const results: { id: string; status: string; pickup_coords?: any; dropoff_coords?: any }[] = [];

    // Build query
    let query = supabase.from('profiles').select('id, pickup_address, dropoff_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng');
    
    if (student_id) {
      query = query.eq('id', student_id);
    } else if (geocode_all) {
      // Only geocode students with addresses but no coordinates
      query = query.or('and(pickup_address.neq.,pickup_lat.is.null),and(dropoff_address.neq.,dropoff_lat.is.null)');
    } else {
      return new Response(JSON.stringify({ error: 'Provide student_id or geocode_all' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: students, error: fetchError } = await query;
    if (fetchError) throw fetchError;
    if (!students || students.length === 0) {
      return new Response(JSON.stringify({ results: [], message: 'No students to geocode' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    for (const student of students) {
      const update: Record<string, any> = {};
      let status = 'skipped';

      // Geocode pickup if address exists but no coordinates
      if (student.pickup_address && (!student.pickup_lat || !student.pickup_lng)) {
        const coords = await geocodeAddress(student.pickup_address);
        if (coords) {
          update.pickup_lat = coords.lat;
          update.pickup_lng = coords.lng;
          status = 'geocoded';
        } else {
          status = 'pickup_failed';
        }
        // Rate limit: wait 1s between Nominatim requests
        await new Promise(r => setTimeout(r, 1100));
      }

      // Geocode dropoff if address exists but no coordinates
      if (student.dropoff_address && (!student.dropoff_lat || !student.dropoff_lng)) {
        const coords = await geocodeAddress(student.dropoff_address);
        if (coords) {
          update.dropoff_lat = coords.lat;
          update.dropoff_lng = coords.lng;
          status = status === 'geocoded' ? 'geocoded' : 'geocoded';
        } else {
          status = status === 'geocoded' ? 'partial' : 'dropoff_failed';
        }
        await new Promise(r => setTimeout(r, 1100));
      }

      if (Object.keys(update).length > 0) {
        update.last_geocoded_at = new Date().toISOString();
        const { error: updateError } = await supabase
          .from('profiles')
          .update(update)
          .eq('id', student.id);
        
        if (updateError) {
          status = 'update_failed';
        }
      }

      results.push({
        id: student.id,
        status,
        pickup_coords: update.pickup_lat ? { lat: update.pickup_lat, lng: update.pickup_lng } : undefined,
        dropoff_coords: update.dropoff_lat ? { lat: update.dropoff_lat, lng: update.dropoff_lng } : undefined,
      });
    }

    return new Response(JSON.stringify({ results, geocoded: results.filter(r => r.status === 'geocoded').length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
