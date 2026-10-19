# Personal data, retention and deletion

This describes what the software does. The retention periods themselves must be set with legal
counsel (Law 18-07 on the protection of personal data, commercial record-keeping obligations).

## What is collected

| Data | Purpose | Who can read it |
|---|---|---|
| Account: e-mail, name, phone, wilaya, language, e-mail preference | Account and contact | The user; staff |
| Purchase request contact fields | Handling the request | The customer; staff. **Never suppliers or partners** |
| Request preferences and message | Preparing quotations | The customer; staff; the routed supplier (via a view without contact fields) |
| Supplier/partner business data | Verification and listing | Owner; staff. Public profile: name, city, country, description, website only |
| Verification documents | Supplier/partner verification | Owner; staff (signed URLs, 60 s). Never public |
| Contact messages | Answering the sender | Staff |
| Audit log | Accountability | Staff (append-only) |

Customers are never asked for identity documents.

## Access, correction, deletion

Users file requests from `/account/privacy`. Staff process them in `/admin/users`:

- **Access / correction**: answered by staff. Users can correct most profile fields themselves in `/account/profile`.
- **Deletion**: an administrator deletes the user in the Supabase dashboard (*Authentication → Users*)
  after checking that no legal hold applies. The database then:
  - cascades `profiles`, `user_roles`, `favorites`, `notifications`, saved estimates;
  - **scrubs** personal fields on retained records (`private.scrub_user_pii`): request contact
    name/phone/e-mail, message and preferences are replaced or nulled, and `customer_id` becomes null;
  - writes a `user.deleted` audit entry.
- Supplier and partner owners cannot be deleted while their business profile exists
  (`ON DELETE RESTRICT`). An administrator must first suspend the business and decide what happens to
  its listings and quotations, which may need to be retained as transaction records.

## Retention to define

- Closed purchase requests and quotations (commercial records)
- Verification documents after a business leaves (delete storage objects in `verification-docs/{uid}/`)
- Contact messages and handled data requests
- Audit log

None are purged automatically today. Add scheduled jobs once the periods are decided.
