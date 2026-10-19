(() => {
  "use strict";

  const CHECKED = "2026-10-19";
  const CITIES = ["الجزائر العاصمة", "وهران", "عنابة", "قسنطينة", "أدرار"];

  // status: "ok" = confirmed from an official source; "check" = conflicting or dated sources.
  // group: "schengen" or "other". links[0] is the primary action; official domains only.
  const CENTERS = [
    { dest: "🇫🇷 فرنسا", group: "schengen", provider: "Capago", status: "ok",
      cities: ["الجزائر العاصمة", "وهران", "عنابة", "قسنطينة"],
      info: "قدّم الطلب أولًا على France-Visas، ثم احجز الموعد على موقع Capago. <b>الموعد لا يُثبَّت إلا بعد دفع رسوم الخدمة خلال ٧٢ ساعة.</b> الإيداع من الأحد إلى الخميس، مع خدمة مدفوعة \"Prime Time\" خارج الأوقات العادية.",
      links: [["حجز الموعد — Capago", "https://fr-dz.capago.eu/"], ["France-Visas — الجزائر", "https://france-visas.gouv.fr/fr/algerie"]] },
    { dest: "🇪🇸 إسبانيا", group: "schengen", provider: "BLS International", status: "ok",
      cities: ["الجزائر العاصمة", "وهران"],
      info: "مركزان فقط. تابع صفحة الإعلانات في الموقع الرسمي: نُقلت بعض أصناف التأشيرات إلى مركز العاصمة منذ ١٧ أفريل ٢٠٢٦، وتغيرت قواعد مواعيد الأطفال أقل من ١٢ سنة منذ ٢ أوت ٢٠٢٦.",
      links: [["حجز الموعد — BLS الجزائر", "https://algeria.blsspainvisa.com/"]] },
    { dest: "🇮🇹 إيطاليا", group: "schengen", provider: "VFS Global", status: "check",
      cities: ["الجزائر العاصمة", "وهران", "قسنطينة", "عنابة", "أدرار"],
      info: "السفارة الإيطالية تعتمد VFS Global. مركز العاصمة في بن عكنون (N1 Rue Bouteldja Houidef). قائمة المدن والأوقات من مصادر غير رسمية — تحقق قبل التنقل.",
      links: [["VFS Global — إيطاليا", "https://visa.vfsglobal.com/dza/fr/ita"]] },
    { dest: "🇩🇪 ألمانيا", group: "schengen", provider: "VFS Global", status: "ok",
      cities: ["الجزائر العاصمة"],
      info: "الإيداع بموعد مسبق فقط، وموعد منفصل لكل شخص حتى الأطفال. <b>السفارة تنصح بالحجز قبل ٦ إلى ٨ أسابيع.</b> رسوم التأشيرة تُدفع نقدًا بالدينار عند الإيداع.",
      links: [["السفارة الألمانية — نظام المواعيد", "https://algier.diplo.de/dz-fr/service/1188870-1188870"]] },
    { dest: "🇧🇪 بلجيكا", group: "schengen", provider: "TLScontact", status: "ok",
      cities: ["الجزائر العاصمة"],
      info: "املأ الطلب على Visa On Web أولًا. <b>يجب دفع رسوم الخدمة خلال ٣٠ دقيقة من الحجز وإلا يُلغى الموعد.</b> منذ ١ أكتوبر ٢٠٢٦ تمر طلبات الإقامة الطويلة للوكسمبورغ عبر المركز البلجيكي.",
      links: [["حجز الموعد — TLScontact بلجيكا", "https://visas-be.tlscontact.com/fr-fr/country/dz/vac/dzALG2be"]] },
    { dest: "🇵🇹 البرتغال", group: "schengen", provider: "TLScontact", status: "ok",
      cities: ["الجزائر العاصمة"],
      info: "منذ ٢٠ جويلية ٢٠٢٦ <b>يجب دفع رسوم الخدمة على الإنترنت لتأكيد الموعد.</b> الموقع الرسمي ينشر تنبيهات من عمليات نصب في الحجز.",
      links: [["حجز الموعد — TLScontact البرتغال", "https://visas-pt.tlscontact.com/fr-fr/country/dz/vac/dzALG2pt"]] },
    { dest: "🇳🇱 هولندا", group: "schengen", provider: "VFS Global", status: "ok",
      cities: ["الجزائر العاصمة"],
      info: "احجز بنفسك دون وسيط، وموعد منفصل لكل شخص. يمكن التقديم قبل السفر بـ ٦ أشهر كحد أقصى و١٥ يومًا كحد أدنى.",
      links: [["الحكومة الهولندية — التقديم من الجزائر", "https://www.netherlandsworldwide.nl/visa-the-netherlands/schengen-visa/apply-algeria.fr"], ["VFS Global — هولندا", "https://visa.vfsglobal.com/one-pager/netherlands/algeria/english/"]] },
    { dest: "🇦🇹 النمسا", group: "schengen", provider: "VFS Global", status: "ok",
      cities: ["الجزائر العاصمة"],
      info: "المركز: 01 Rue Tripoli، حسين داي. الإيداع من الأحد إلى الأربعاء، ٨:٣٠ إلى ١٣:٣٠. رسوم الخدمة ٤٦٥٠ دج تُدفع على الإنترنت.",
      links: [["VFS Global — النمسا", "https://visa.vfsglobal.com/dza/en/aut/attend-centre/Alger"]] },
    { dest: "🇭🇺 المجر", group: "schengen", provider: "VFS Global", status: "ok",
      cities: ["الجزائر العاصمة"],
      info: "الحجز على موقع VFS Global الخاص بالمجر.",
      links: [["حجز الموعد — VFS المجر", "https://visa.vfsglobal.com/dza/en/hun/book-an-appointment"]] },
    { dest: "🇨🇭 سويسرا", group: "schengen", provider: "السفارة مباشرة", status: "ok",
      cities: ["الجزائر العاصمة"],
      info: "طلب الموعد عبر استمارة على موقع السفارة السويسرية.",
      links: [["السفارة السويسرية — طلب موعد", "https://www.eda.admin.ch/countries/algeria/fr/home/visa/entree-ch/formular.html"]] },

    { dest: "🇬🇧 بريطانيا", group: "other", provider: "VFS Global", status: "ok",
      cities: ["الجزائر العاصمة"],
      info: "منذ نوفمبر ٢٠٢٤ أغلق TLScontact مراكزه وانتقلت الخدمة إلى VFS Global. الطلب يبدأ على موقع الحكومة البريطانية، ثم يُحجز موعد البصمات.",
      links: [["GOV.UK — تأشيرة الزيارة", "https://www.gov.uk/standard-visitor"]] },
    { dest: "🇨🇦 كندا", group: "other", provider: "VFS Global (البصمات)", status: "check",
      cities: ["الجزائر العاصمة"],
      info: "الطلب كله على الإنترنت عبر موقع الهجرة الكندية، ثم موعد لأخذ البصمات في مركز VFS.",
      links: [["الحكومة الكندية — زيارة كندا", "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada.html"]] },
    { dest: "🇺🇸 الولايات المتحدة", group: "other", provider: "السفارة الأمريكية", status: "check",
      cities: ["الجزائر العاصمة"],
      info: "استمارة DS-160 على الإنترنت، ثم موعد مقابلة في السفارة. ابدأ من صفحة التأشيرات الرسمية.",
      links: [["السفارة الأمريكية — التأشيرات", "https://dz.usembassy.gov/visas/"]] },
  ];

  const $ = (s) => document.querySelector(s);
  let group = "all", city = "";
  const host = (u) => new URL(u).hostname.replace(/^www\./, "");

  $("#cityFilter").innerHTML = `<option value="">كل الولايات</option>` + CITIES.map((c) => `<option>${c}</option>`).join("");

  function render() {
    const q = $("#q").value.trim().toLowerCase();
    const rows = CENTERS.filter((x) => (group === "all" || x.group === group) && (!city || x.cities.includes(city)) &&
      (!q || [x.dest, x.provider, x.cities.join(" ")].join(" ").toLowerCase().includes(q)));
    $("#grid").innerHTML = rows.length ? rows.map((x) => `
      <article class="center">
        <header>
          <div><div class="from">${x.group === "schengen" ? "شنغن" : "خارج شنغن"}</div><h2>${x.dest}</h2></div>
          <span class="badge ${x.status}">${x.status === "ok" ? "✓ مؤكد" : "تحقّق"}</span>
        </header>
        <div>الجهة المعتمدة: <span class="provider">${x.provider}</span></div>
        <div class="cities">${x.cities.map((c) => `<span>${c}</span>`).join("")}</div>
        <p class="info">${x.info}</p>
        <div class="links">${x.links.map(([label, url], i) =>
          `<a class="btn ${i === 0 ? "primary" : "ghost"}" href="${url}" target="_blank" rel="noopener noreferrer">${label} ↗<small>${host(url)}</small></a>`).join("")}</div>
      </article>`).join("") : `<p class="none">لا توجد نتائج.</p>`;
    document.querySelectorAll("[data-group]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.group === group)));
    $("#count").textContent = new Intl.NumberFormat("ar-EG").format(rows.length);
  }

  document.querySelectorAll("[data-group]").forEach((b) => b.addEventListener("click", () => { group = b.dataset.group; render(); }));
  $("#cityFilter").addEventListener("change", (e) => { city = e.target.value; render(); });
  $("#q").addEventListener("input", render);
  $("#checked").textContent = new Date(CHECKED).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  $("#themeToggle").addEventListener("click", () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("sanad-theme", root.dataset.theme); } catch (_) {}
  });
  try { const t = localStorage.getItem("sanad-theme"); if (t) document.documentElement.dataset.theme = t; } catch (_) {}

  render();
})();
