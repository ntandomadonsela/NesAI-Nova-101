import { createFileRoute } from "@tanstack/react-router";
import { requireAdmin } from "@/lib/admin-auth.server";

const PAGE_SIZE = 1000;

export const Route = createFileRoute("/api/admin/console")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const access = await requireAdmin(request);
        if (access instanceof Response) return access;

        try {
          const { supabaseAdmin } = access;
          const authUsers = [];
          for (let page = 1; ; page += 1) {
            const { data, error } = await supabaseAdmin.auth.admin.listUsers({
              page,
              perPage: PAGE_SIZE,
            });
            if (error) throw error;
            authUsers.push(...data.users);
            if (data.users.length < PAGE_SIZE || page >= (data.lastPage ?? page)) break;
          }

          const profiles = [];
          for (let from = 0; ; from += PAGE_SIZE) {
            const { data, error } = await supabaseAdmin
              .from("profiles")
              .select("id, full_name, academic_level, is_premium, created_at")
              .order("created_at", { ascending: false })
              .range(from, from + PAGE_SIZE - 1);
            if (error) throw error;
            profiles.push(...(data ?? []));
            if (!data || data.length < PAGE_SIZE) break;
          }

          const resources = [];
          for (let from = 0; ; from += PAGE_SIZE) {
            const { data, error } = await supabaseAdmin
              .from("resources")
              .select(
                "id, title, document_type, academic_level, faculty_or_curriculum, subject_or_module, year, file_url, created_at",
              )
              .order("created_at", { ascending: false })
              .range(from, from + PAGE_SIZE - 1);
            if (error) throw error;
            resources.push(...(data ?? []));
            if (!data || data.length < PAGE_SIZE) break;
          }

          const { data: subscriptions, error: subscriptionError } = await supabaseAdmin
            .from("subscriptions")
            .select("user_id, provider, status, current_period_end, updated_at")
            .order("updated_at", { ascending: false });
          if (subscriptionError) throw subscriptionError;

          const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
          const userById = new Map(authUsers.map((user) => [user.id, user]));
          const subscriptionByUser = new Map<string, (typeof subscriptions)[number]>();
          for (const subscription of subscriptions ?? []) {
            if (!subscriptionByUser.has(subscription.user_id)) {
              subscriptionByUser.set(subscription.user_id, subscription);
            }
          }

          const signups = authUsers
            .map((user) => {
              const profile = profileById.get(user.id);
              return {
                id: user.id,
                email: user.email ?? "",
                fullName: profile?.full_name || String(user.user_metadata?.full_name ?? ""),
                academicLevel: profile?.academic_level ?? "",
                isPremium: Boolean(profile?.is_premium),
                createdAt: user.created_at,
                emailConfirmedAt: user.email_confirmed_at ?? null,
              };
            })
            .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

          const subscribers = profiles
            .filter((profile) => profile.is_premium)
            .map((profile) => {
              const user = userById.get(profile.id);
              const subscription = subscriptionByUser.get(profile.id);
              return {
                id: profile.id,
                email: user?.email ?? "",
                fullName: profile.full_name,
                provider: subscription?.provider ?? "—",
                status: subscription?.status ?? "active",
                currentPeriodEnd: subscription?.current_period_end ?? null,
                since: subscription?.updated_at ?? profile.created_at,
              };
            })
            .sort((a, b) => Date.parse(b.since) - Date.parse(a.since));

          return Response.json({
            summary: {
              signups: authUsers.length,
              subscribers: subscribers.length,
              documents: resources.length,
            },
            signups: signups.slice(0, 100),
            subscribers,
            resources,
          });
        } catch (error) {
          console.error("Admin console data request failed", error);
          return Response.json(
            { error: "Could not load admin data. Check the server configuration and try again." },
            { status: 500 },
          );
        }
      },
    },
  },
});
