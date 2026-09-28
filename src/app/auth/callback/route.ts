import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const email = data.user.email;
      const name =
        data.user.user_metadata?.full_name ||
        data.user.user_metadata?.name ||
        email?.split('@')[0] ||
        'Tutor';

      if (email) {
        // Automatic Multi-Tenant Sync: Link to existing or create new tutor profile
        await prisma.tutor.upsert({
          where: { email },
          update: { name },
          create: {
            name,
            email,
          },
        });
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}