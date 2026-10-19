import type { routing } from "@/i18n/routing";
import type meta from "../messages/fr/meta.json";
import type common from "../messages/fr/common.json";
import type nav from "../messages/fr/nav.json";
import type footer from "../messages/fr/footer.json";
import type auth from "../messages/fr/auth.json";
import type validation from "../messages/fr/validation.json";
import type errors from "../messages/fr/errors.json";
import type enums from "../messages/fr/enums.json";
import type home from "../messages/fr/home.json";
import type vehicles from "../messages/fr/vehicles.json";
import type estimate from "../messages/fr/estimate.json";
import type requests from "../messages/fr/requests.json";
import type account from "../messages/fr/account.json";
import type supplier from "../messages/fr/supplier.json";
import type partner from "../messages/fr/partner.json";
import type admin from "../messages/fr/admin.json";
import type pages from "../messages/fr/pages.json";

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: {
      meta: typeof meta; common: typeof common; nav: typeof nav; footer: typeof footer; auth: typeof auth;
      validation: typeof validation; errors: typeof errors; enums: typeof enums; home: typeof home;
      vehicles: typeof vehicles; estimate: typeof estimate; requests: typeof requests; account: typeof account;
      supplier: typeof supplier; partner: typeof partner; admin: typeof admin; pages: typeof pages;
    };
  }
}
