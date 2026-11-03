import { createClient } from "@supabase/supabase-js";

/**
 * Smoke test area staf (reviewer & moderator) terhadap dev server nyata.
 *
 * Membuat pengguna dengan role tertentu, merangkai cookie sesi seperti
 * @supabase/ssr (prefix `base64-` + base64url JSON), lalu memeriksa akses:
 *  - reviewer: /review 200, item menunggu tampil, /review/[id] 200
 *  - member: /review → redirect (bukan 200)
 *  - moderator: /moderation/reports 200
 *  - moderator sebagai member biasa → redirect
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.SMOKE_APP_URL ?? "http://localhost:3000";

let failures = 0;
function log(ok, label, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failures += 1;
}

async function main() {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const password = "Staff-Pass-123!";
  async function makeUser(tag, roles) {
    const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const email = `${tag}-${unique}@example.test`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { user_name: `${tag}-${unique}`.slice(0, 30) },
    });
    if (error) throw new Error(`create ${tag}: ${error.message}`);
    await new Promise((r) => setTimeout(r, 800));
    if (roles.length > 0) {
      for (const role of roles) {
        await admin.from("user_roles").insert({ user_id: data.user.id, role });
      }
    }
    return { id: data.user.id, email };
  }

  async function cookieFor(email) {
    const s = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { data, error } = await s.auth.signInWithPassword({ email, password });
    if (error) throw new Error(`signin ${email}: ${error.message}`);
    return (
      "sb-127-auth-token=base64-" +
      Buffer.from(JSON.stringify(data.session), "utf8").toString("base64url")
    );
  }

  const contributor = await makeUser("smember", []);
  const reviewer = await makeUser("sreview", ["reviewer"]);
  const moderator = await makeUser("smod", ["moderator"]);

  // Program pending yang dibuat kontributor, agar antrean review tidak kosong.
  const { data: category } = await admin.from("categories").select("id").limit(1).single();
  const cAuth = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: cSign } = await cAuth.auth.signInWithPassword({
    email: contributor.email,
    password,
  });
  const uniqueSlug = `smoke-rev-${Date.now().toString(36)}`;
  const { data: program } = await cAuth
    .from("assistance_programs")
    .insert({
      title: "Program Uji Smoke Antrean Review",
      slug: uniqueSlug,
      description:
        "Deskripsi uji smoke untuk antrean review yang cukup panjang melebihi lima puluh karakter.",
      category_id: category.id,
      organizer: "Org Uji Smoke",
      contributor_id: cSign.user.id,
      status: "draft",
    })
    .select("id")
    .single();
  await cAuth.from("sources").insert({
    program_id: program.id,
    source_url: `https://contoh.go.id/${uniqueSlug}`,
    source_url_normalized: `https://contoh.go.id/${uniqueSlug}`,
    source_type: "situs_resmi",
    is_primary: true,
  });
  await cAuth.rpc("submit_program", { p_program_id: program.id });

  const reviewerCookie = await cookieFor(reviewer.email);
  const memberCookie = await cookieFor(contributor.email);
  const modCookie = await cookieFor(moderator.email);

  // 1. Reviewer melihat antrean.
  const queue = await fetch(`${APP_URL}/review`, {
    headers: { cookie: reviewerCookie },
    redirect: "manual",
  });
  const queueHtml = await queue.text();
  log(queue.status === 200, "Reviewer GET /review → 200", `status ${queue.status}`);
  log(
    queueHtml.includes("Program Uji Smoke Antrean Review"),
    "Antrean menampilkan program pending",
  );

  // 2. Reviewer membuka panel review.
  const detail = await fetch(`${APP_URL}/review/${program.id}`, {
    headers: { cookie: reviewerCookie },
    redirect: "manual",
  });
  const detailHtml = await detail.text();
  log(detail.status === 200, "Reviewer GET /review/[id] → 200", `status ${detail.status}`);
  log(detailHtml.includes("Keputusan tinjauan"), "Panel review memuat aksi keputusan");

  // 3. Member biasa tidak boleh akses /review.
  const memberReview = await fetch(`${APP_URL}/review`, {
    headers: { cookie: memberCookie },
    redirect: "manual",
  });
  log(
    memberReview.status === 307,
    "Member GET /review → redirect",
    `status ${memberReview.status} → ${memberReview.headers.get("location") ?? "-"}`,
  );

  // 4. Moderator melihat laporan.
  const reports = await fetch(`${APP_URL}/moderation/reports`, {
    headers: { cookie: modCookie },
    redirect: "manual",
  });
  log(reports.status === 200, "Moderator GET /moderation/reports → 200", `status ${reports.status}`);

  // 5. Member biasa tidak boleh akses /moderation.
  const memberMod = await fetch(`${APP_URL}/moderation/reports`, {
    headers: { cookie: memberCookie },
    redirect: "manual",
  });
  log(
    memberMod.status === 307,
    "Member GET /moderation/reports → redirect",
    `status ${memberMod.status}`,
  );

  // 6. Reviewer tidak boleh akses /moderation (bukan moderator).
  const reviewerMod = await fetch(`${APP_URL}/moderation/reports`, {
    headers: { cookie: reviewerCookie },
    redirect: "manual",
  });
  log(
    reviewerMod.status === 307,
    "Reviewer GET /moderation/reports → redirect",
    `status ${reviewerMod.status}`,
  );

  // 7. Cron tanpa secret → 401.
  const cronNoAuth = await fetch(`${APP_URL}/api/cron/expire`, { redirect: "manual" });
  log(cronNoAuth.status === 401, "Cron tanpa secret → 401", `status ${cronNoAuth.status}`);

  // 8. Cron dengan secret salah → 401.
  const cronBad = await fetch(`${APP_URL}/api/cron/expire`, {
    headers: { authorization: "Bearer salah-sekali" },
    redirect: "manual",
  });
  log(cronBad.status === 401, "Cron dengan secret salah → 401", `status ${cronBad.status}`);

  // Bersihkan.
  await admin.auth.admin.deleteUser(contributor.id);
  await admin.auth.admin.deleteUser(reviewer.id);
  await admin.auth.admin.deleteUser(moderator.id);
  await admin.from("assistance_programs").delete().eq("id", program.id);

  console.log(`\nKegagalan: ${failures}`);
  if (failures > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
