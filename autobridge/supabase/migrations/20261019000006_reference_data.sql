-- Reference data required in every environment (not demonstration data).
-- Nothing here asserts a legal rule, tax rate or price. Values that require
-- verification are left for an administrator to document in the admin panel.

insert into public.currencies (code, name_ar, name_fr, symbol, minor_units) values
  ('DZD', 'دينار جزائري', 'Dinar algérien', 'DA', 2),
  ('EUR', 'يورو', 'Euro', '€', 2),
  ('USD', 'دولار أمريكي', 'Dollar américain', '$', 2),
  ('AED', 'درهم إماراتي', 'Dirham des EAU', 'AED', 2),
  ('CNY', 'يوان صيني', 'Yuan chinois', '¥', 2);

insert into public.vehicle_makes (name, slug) values
  ('Audi', 'audi'), ('BMW', 'bmw'), ('BYD', 'byd'), ('Chery', 'chery'), ('Citroën', 'citroen'),
  ('Dacia', 'dacia'), ('Fiat', 'fiat'), ('Ford', 'ford'), ('Geely', 'geely'), ('Honda', 'honda'),
  ('Hyundai', 'hyundai'), ('Kia', 'kia'), ('Mazda', 'mazda'), ('Mercedes-Benz', 'mercedes-benz'),
  ('MG', 'mg'), ('Mitsubishi', 'mitsubishi'), ('Nissan', 'nissan'), ('Opel', 'opel'),
  ('Peugeot', 'peugeot'), ('Renault', 'renault'), ('SEAT', 'seat'), ('Škoda', 'skoda'),
  ('Suzuki', 'suzuki'), ('Tesla', 'tesla'), ('Toyota', 'toyota'), ('Volkswagen', 'volkswagen'),
  ('Volvo', 'volvo');

insert into public.service_categories (code, name_ar, name_fr, position) values
  ('export_agent', 'وكيل تصدير', 'Agent d''exportation', 1),
  ('vehicle_inspection', 'فحص المركبات', 'Inspection de véhicules', 2),
  ('shipping_logistics', 'الشحن والخدمات اللوجستية', 'Transport et logistique', 3),
  ('customs_professional', 'مهني جمركي معتمد', 'Professionnel en douane agréé', 4),
  ('insurance', 'التأمين', 'Assurance', 5),
  ('other', 'خدمات أخرى', 'Autres services', 9);

insert into public.acquisition_pathways
  (code, name_ar, name_fr, description_ar, description_fr, requires_legal_review, position)
values
  ('individual_used_vehicle',
   'استيراد سيارة مستعملة من طرف شخص طبيعي',
   'Importation d''un véhicule d''occasion par un particulier',
   'مسار موجّه للأشخاص الطبيعيين الذين يرغبون في استيراد سيارة مستعملة للاستعمال الشخصي. شروط الأهلية (مثل عمر المركبة ونوع المحرك وعدد المرات المسموح بها) تحددها التنظيمات الجزائرية السارية وقد تتغير. يتحقق فريقنا من انطباق الشروط على حالتك قبل أي التزام.',
   'Parcours destiné aux particuliers souhaitant importer un véhicule d''occasion pour un usage personnel. Les conditions d''éligibilité (âge du véhicule, motorisation, fréquence autorisée, etc.) sont fixées par la réglementation algérienne en vigueur et peuvent évoluer. Notre équipe vérifie leur applicabilité à votre situation avant tout engagement.',
   true, 1),
  ('new_vehicle',
   'اقتناء سيارة جديدة',
   'Acquisition d''un véhicule neuf',
   'اقتناء سيارة جديدة عبر القنوات التي تسمح بها التنظيمات السارية. تربطك المنصة بالموردين، ويتم التحقق من الأهلية حالةً بحالة.',
   'Acquisition d''un véhicule neuf par les canaux permis par la réglementation en vigueur. La plateforme vous met en relation avec des fournisseurs ; l''éligibilité est vérifiée au cas par cas.',
   true, 2),
  ('change_of_residence',
   'تحويل الإقامة إلى الجزائر',
   'Changement de résidence vers l''Algérie',
   'حالة خاصة بالأشخاص الذين ينقلون إقامتهم إلى الجزائر. تنطبق شروط ووثائق خاصة، ويخضع الطلب لمراجعة قانونية.',
   'Cas particulier des personnes qui transfèrent leur résidence en Algérie. Des conditions et des pièces spécifiques s''appliquent ; la demande fait l''objet d''un examen juridique.',
   true, 3),
  ('undecided',
   'لست متأكدًا — أحتاج إلى استشارة',
   'Je ne sais pas encore — j''ai besoin de conseils',
   'اختر هذا الخيار إذا لم تكن متأكدًا من المسار المناسب لحالتك. سيراجع فريقنا طلبك ويوجّهك.',
   'Choisissez cette option si vous ne savez pas quel parcours correspond à votre situation. Notre équipe examinera votre demande et vous orientera.',
   true, 9);

insert into public.site_settings (key, value, is_public) values
  ('contact.email', 'null'::jsonb, true),
  ('contact.phone', 'null'::jsonb, true),
  ('contact.address', 'null'::jsonb, true),
  ('contact.hours', 'null'::jsonb, true),
  ('listing.validity_days', '90'::jsonb, true),
  ('listing.stale_after_days', '30'::jsonb, true),
  ('homepage.hero_title_ar', 'null'::jsonb, true),
  ('homepage.hero_title_fr', 'null'::jsonb, true),
  ('homepage.hero_subtitle_ar', 'null'::jsonb, true),
  ('homepage.hero_subtitle_fr', 'null'::jsonb, true),
  ('notifications.email_enabled', 'true'::jsonb, false);

insert into public.faqs (question_ar, question_fr, answer_ar, answer_fr, position) values
  ('هل تبيع AutoBridge DZ السيارات مباشرة؟',
   'AutoBridge DZ vend-elle directement des véhicules ?',
   'لا. AutoBridge DZ منصة وساطة رقمية تربط المشترين في الجزائر بموردين ومقدمي خدمات في الخارج. البائع هو المورد المذكور في الإعلان، ومقدمو الخدمات (الشحن، الفحص، التخليص) شركاء مستقلون.',
   'Non. AutoBridge DZ est une plateforme d''intermédiation numérique qui met en relation des acheteurs en Algérie avec des fournisseurs et des prestataires à l''étranger. Le vendeur est le fournisseur indiqué dans l''annonce ; les prestataires (transport, inspection, dédouanement) sont des partenaires indépendants.',
   1),
  ('هل ظهور سيارة على المنصة يعني أنها قابلة للاستيراد إلى الجزائر؟',
   'Un véhicule affiché sur la plateforme est-il forcément importable en Algérie ?',
   'لا. ظهور الإعلان لا يعني أن المركبة مؤهلة للاستيراد. الأهلية تعتمد على المسار القانوني ووضعك الشخصي وخصائص المركبة، ويتم التحقق منها قبل أي التزام.',
   'Non. La présence d''une annonce ne signifie pas que le véhicule est éligible à l''importation. L''éligibilité dépend du parcours juridique, de votre situation et des caractéristiques du véhicule ; elle est vérifiée avant tout engagement.',
   2),
  ('هل التكلفة التقديرية نهائية؟',
   'L''estimation de coût est-elle définitive ?',
   'لا. الحاسبة تقدّم تقديرًا مفصلًا وشفافًا بناءً على المعطيات المتوفرة، ولا تمثل تقييمًا جمركيًا رسميًا. التكلفة النهائية تحددها عروض الأسعار المؤكدة والتقييم الرسمي للجهات المختصة.',
   'Non. Le calculateur fournit une estimation détaillée et transparente à partir des données disponibles ; il ne constitue pas une liquidation douanière officielle. Le coût final dépend des devis confirmés et de l''évaluation officielle des autorités compétentes.',
   3),
  ('ماذا يعني "مورد تم التحقق منه"؟',
   'Que signifie « fournisseur vérifié » ?',
   'نعرض بالتفصيل عمليات التحقق التي أُنجزت فعلًا وتاريخها (مثل التحقق من السجل التجاري أو وسائل الاتصال). لا نصف أي مورد بأنه موثّق ما لم تُسجَّل هذه العمليات في نظامنا.',
   'Nous affichons le détail des vérifications réellement effectuées et leur date (registre de commerce, coordonnées, etc.). Aucun fournisseur n''est présenté comme vérifié sans que ces contrôles soient enregistrés dans notre système.',
   4),
  ('هل أدفع ثمن السيارة عبر المنصة؟',
   'Dois-je payer le véhicule via la plateforme ?',
   'لا. لا تحصّل المنصة حاليًا ثمن المركبات ولا التحويلات الدولية. تتم ترتيبات الدفع وفق الإطار القانوني والمصرفي المعمول به، وننصحك بعدم تحويل أي مبلغ قبل التحقق من الوثائق.',
   'Non. La plateforme n''encaisse pas actuellement le prix des véhicules ni les transferts internationaux. Les modalités de paiement suivent le cadre légal et bancaire applicable ; nous vous recommandons de ne jamais transférer de fonds avant vérification des documents.',
   5),
  ('كيف أصبح موردًا أو شريكًا؟',
   'Comment devenir fournisseur ou partenaire ?',
   'أنشئ حسابًا ثم قدّم طلب انضمام من صفحة الشركاء. يراجع فريقنا كل طلب يدويًا ولا تُقبل أي حسابات تلقائيًا.',
   'Créez un compte puis déposez une demande depuis la page Partenaires. Chaque demande est examinée manuellement par notre équipe ; aucune inscription n''est approuvée automatiquement.',
   6);

-- Version 1 of the cost rules: every cost requires a quotation, because no value
-- has been verified yet. Administrators publish documented values as new versions.
do $$
declare
  v_set uuid;
begin
  insert into public.cost_rule_sets (version, title, status, notes)
  values (1, 'Initial — all costs on quotation', 'draft',
          'No cost value has been verified. Every line requires a quotation or an official assessment.')
  returning id into v_set;

  insert into public.cost_estimate_rules
    (rule_set_id, code, kind, label_ar, label_fr, method, source, notes_ar, notes_fr, position)
  select v_set, r.code, r.kind::public.fee_kind, r.label_ar, r.label_fr, 'quote_required', r.source,
         r.notes_ar, r.notes_fr, r.position
  from (values
  ('domestic_transport', 'domestic_transport', 'النقل الداخلي في بلد المصدر', 'Transport dans le pays d''origine',
   'Not established', 'يحدَّد بعرض سعر من المورد أو الناقل.', 'Fixé par devis du fournisseur ou du transporteur.', 1),
  ('international_shipping', 'international_shipping', 'الشحن الدولي', 'Transport international',
   'Not established', 'يحدَّد بعرض سعر من شركة الشحن.', 'Fixé par devis du transitaire.', 2),
  ('insurance', 'insurance', 'التأمين أثناء النقل', 'Assurance transport',
   'Not established', 'يحدَّد بعرض سعر من شركة التأمين.', 'Fixé par devis de l''assureur.', 3),
  ('inspection', 'inspection', 'الفحص التقني (اختياري)', 'Inspection technique (facultative)',
   'Not established', 'خدمة اختيارية يقدّمها شريك مستقل.', 'Service facultatif fourni par un partenaire indépendant.', 4),
  ('taxes_and_customs', 'taxes_and_customs', 'الرسوم الجمركية والضرائب', 'Droits de douane et taxes',
   'Official assessment required', 'تحددها الجهات الجمركية المختصة حسب المسار القانوني والمركبة. لا تمثل الحاسبة تقييمًا رسميًا.',
   'Déterminés par l''administration des douanes selon le parcours juridique et le véhicule. Le calculateur ne constitue pas une liquidation officielle.', 5),
  ('documentation_admin', 'documentation_admin', 'الوثائق والمصاريف الإدارية', 'Documents et frais administratifs',
   'Not established', 'تختلف حسب الحالة.', 'Variables selon le dossier.', 6),
  ('partner_service_fee', 'partner_service_fee', 'أتعاب الشركاء (تخليص، وكالة…)', 'Honoraires des partenaires (transit, agence…)',
   'Not established', 'تحدَّد بعرض سعر من الشريك.', 'Fixés par devis du partenaire.', 7)
) as r (code, kind, label_ar, label_fr, source, notes_ar, notes_fr, position);

  update public.cost_rule_sets set status = 'active', activated_at = now() where id = v_set;
end;
$$;

-- Legal documents: templates that MUST be reviewed by qualified counsel before launch.
insert into public.legal_documents (slug, locale, version, title, body, is_published, published_at) values
('terms', 'ar', 1, 'شروط الاستخدام',
$md$> **نموذج أولي — يجب مراجعته من طرف مستشار قانوني مؤهل قبل الإطلاق التجاري.**

## 1. طبيعة الخدمة
AutoBridge DZ منصة وساطة رقمية تربط المشترين المقيمين في الجزائر بموردين للمركبات ومقدمي خدمات مستقلين في الخارج. المنصة ليست بائعًا للمركبات ولا ناقلًا ولا وكيلًا جمركيًا، ولا تدّعي أي اعتماد حكومي.

## 2. الإعلانات
- يتحمل كل مورد مسؤولية دقة المعلومات التي ينشرها.
- تُراجَع الإعلانات قبل نشرها، لكن المراجعة لا تضمن قابلية المركبة للاستيراد ولا حالتها الفعلية.
- لا يعني ظهور مركبة على المنصة أنها مؤهلة للاستيراد إلى الجزائر.

## 3. التقديرات وعروض الأسعار
- الحاسبة تقدّم تقديرًا فقط، ولا تمثّل تقييمًا جمركيًا رسميًا.
- عرض السعر ليس سعرًا نهائيًا مضمونًا، ويخضع للشروط المذكورة فيه ولتاريخ صلاحيته.

## 4. المدفوعات
لا تحصّل المنصة ثمن المركبات ولا التحويلات الدولية في هذه المرحلة.

## 5. مسؤوليات الأطراف
- **المنصة:** تسهيل التواصل، مراجعة الطلبات، وتسجيل عمليات التحقق التي أُنجزت فعلًا.
- **الموردون:** صحة الإعلانات والوثائق والالتزام بالقوانين المطبقة عليهم.
- **الشركاء المستقلون:** تنفيذ خدماتهم وفق عقودهم واعتماداتهم.
- **المستخدم:** تقديم معلومات صحيحة والتحقق من الوثائق قبل أي دفع.

## 6. القانون المطبق
تخضع هذه الشروط للقانون الجزائري.
$md$, true, now()),
('terms', 'fr', 1, 'Conditions d''utilisation',
$md$> **Modèle initial — à faire relire par un conseil juridique qualifié avant tout lancement commercial.**

## 1. Nature du service
AutoBridge DZ est une plateforme d'intermédiation numérique qui met en relation des acheteurs résidant en Algérie avec des fournisseurs de véhicules et des prestataires indépendants à l'étranger. La plateforme n'est ni vendeur de véhicules, ni transporteur, ni commissionnaire en douane, et ne revendique aucun agrément public.

## 2. Annonces
- Chaque fournisseur est responsable de l'exactitude des informations qu'il publie.
- Les annonces sont examinées avant publication, sans que cet examen garantisse l'éligibilité du véhicule à l'importation ni son état réel.
- La présence d'un véhicule sur la plateforme ne signifie pas qu'il est importable en Algérie.

## 3. Estimations et devis
- Le calculateur fournit une estimation et ne constitue pas une liquidation douanière officielle.
- Un devis n'est pas un prix final garanti ; il est soumis à ses conditions et à sa date de validité.

## 4. Paiements
À ce stade, la plateforme n'encaisse ni le prix des véhicules ni les transferts internationaux.

## 5. Responsabilités des parties
- **La plateforme :** faciliter la mise en relation, examiner les demandes et enregistrer les vérifications effectivement réalisées.
- **Les fournisseurs :** exactitude des annonces et des documents, respect des lois qui leur sont applicables.
- **Les partenaires indépendants :** exécution de leurs prestations conformément à leurs contrats et agréments.
- **L'utilisateur :** fournir des informations exactes et vérifier les documents avant tout paiement.

## 6. Droit applicable
Les présentes conditions sont régies par le droit algérien.
$md$, true, now()),
('privacy', 'ar', 1, 'سياسة الخصوصية',
$md$> **نموذج أولي — يجب مراجعته للتأكد من مطابقته للقانون رقم 18-07 المتعلق بحماية الأشخاص الطبيعيين في مجال معالجة المعطيات ذات الطابع الشخصي ولأي نص تطبيقي.**

## البيانات التي نجمعها
- بيانات الحساب: البريد الإلكتروني، الاسم، رقم الهاتف، الولاية، اللغة المفضلة.
- بيانات الطلبات: تفضيلاتك ووسائل التواصل التي تقدّمها في طلب الشراء.
- للموردين والشركاء: معلومات المؤسسة ووثائق التحقق.

لا نطلب من الزبائن رفع وثائق هوية.

## الغرض
معالجة طلباتك، التواصل معك، التحقق من الموردين، والامتثال للالتزامات القانونية.

## من يطّلع على بياناتك
- فريق المنصة المخوّل.
- لا يرى المورد وسائل الاتصال الخاصة بك؛ يرى فقط تفاصيل الطلب اللازمة لإعداد عرض السعر.
- وثائق التحقق الخاصة بالموردين لا تُنشر أبدًا.

## حقوقك
يمكنك طلب الاطلاع على بياناتك أو تصحيحها أو حذف حسابك من صفحة «الخصوصية» في حسابك.

## الحفظ
نحتفظ بالسجلات المرتبطة بالمعاملات المدة التي يفرضها القانون، مع حذف بياناتك الشخصية منها عند حذف الحساب.
$md$, true, now()),
('privacy', 'fr', 1, 'Politique de confidentialité',
$md$> **Modèle initial — à faire vérifier au regard de la loi n° 18-07 relative à la protection des personnes physiques dans le traitement des données à caractère personnel et de ses textes d'application.**

## Données collectées
- Données de compte : e-mail, nom, téléphone, wilaya, langue préférée.
- Données des demandes : vos préférences et les coordonnées que vous indiquez dans une demande d'achat.
- Pour les fournisseurs et partenaires : informations sur l'entreprise et documents de vérification.

Nous ne demandons pas de pièce d'identité aux clients.

## Finalités
Traiter vos demandes, vous contacter, vérifier les fournisseurs et respecter nos obligations légales.

## Destinataires
- L'équipe habilitée de la plateforme.
- Les fournisseurs ne voient pas vos coordonnées ; ils ne voient que les éléments de la demande nécessaires pour établir un devis.
- Les documents de vérification des fournisseurs ne sont jamais publiés.

## Vos droits
Vous pouvez demander l'accès à vos données, leur rectification ou la suppression de votre compte depuis la page « Confidentialité » de votre compte.

## Conservation
Les enregistrements liés aux transactions sont conservés pendant la durée légale ; vos données personnelles en sont retirées lors de la suppression du compte.
$md$, true, now()),
('disclosure', 'ar', 1, 'إفصاح الوساطة',
$md$> **نموذج أولي — يجب مراجعته قانونيًا.**

- AutoBridge DZ وسيط رقمي. لا نملك المركبات المعروضة ولا نبيعها.
- قد تتقاضى المنصة رسوم خدمة أو عمولات إحالة أو اشتراكات من الموردين. تُعرض أي رسوم للمنصة في عروض الأسعار كبند مستقل، ولا تُقدَّم أبدًا على أنها رسوم جمركية أو ضرائب.
- الإعلانات المروَّجة مدفوعة وتظهر دائمًا بعلامة «إعلان ممول».
- الشركاء (الشحن، الفحص، التخليص الجمركي) مستقلون ومسؤولون عن خدماتهم.
- «تم التحقق» يعني فقط عمليات التحقق المذكورة وتاريخها، ولا يعني ضمانًا شاملًا.
$md$, true, now()),
('disclosure', 'fr', 1, 'Déclaration d''intermédiaire',
$md$> **Modèle initial — à faire relire juridiquement.**

- AutoBridge DZ est un intermédiaire numérique. Nous ne possédons ni ne vendons les véhicules affichés.
- La plateforme peut percevoir des frais de service, des commissions d'apport d'affaires ou des abonnements fournisseurs. Tout frais de la plateforme apparaît sur une ligne distincte des devis et n'est jamais présenté comme un droit de douane ou une taxe.
- Les annonces promues sont payantes et toujours signalées par la mention « Sponsorisé ».
- Les partenaires (transport, inspection, dédouanement) sont indépendants et responsables de leurs prestations.
- « Vérifié » désigne uniquement les contrôles indiqués et leur date ; ce n'est pas une garantie générale.
$md$, true, now());
