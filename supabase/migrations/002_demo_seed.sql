-- ============================================================================
-- Nairobi OpsOS — Procurement & Stores Control Tower
-- Migration 002: Demo tenant + sample data + anon (read-only) demo access
--
-- Run AFTER 001_procurement_core.sql, in the Supabase SQL Editor.
--
-- This creates a single client-safe DEMO org with a full procurement chain so
-- every screen and view has realistic data to render. Because it is a separate
-- org row flagged is_demo = true, it is physically isolated from real client
-- data by the same RLS that protects everything else.
--
-- The anon read policies below let a logged-OUT visitor (e.g. a prospect you
-- are demoing to on your phone) read ONLY the demo org. They can never read,
-- and never write, any real tenant.
-- ============================================================================

-- Fixed UUIDs so the chain links together deterministically
-- demo org:        00000000-0000-0000-0000-0000000000d0
-- suppliers:       ...a1 / ...a2
-- stock items:     ...51 .. ...54
-- PR:              ...c1   quotations: ...e1 ...e2   LPO: ...f1   GRN: ...91
-- invoice:         ...b1   payment: ...d1

insert into orgs (id, name, kra_pin, county, is_demo)
values ('00000000-0000-0000-0000-0000000000d0',
        'Demo Plastics & Packaging Ltd', 'P051234567X', 'Nairobi', true)
on conflict (id) do nothing;

insert into suppliers (id, org_id, name, kra_pin, phone, email, lead_time_days, rating) values
 ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000d0',
  'Mombasa Road Polymers',  'P052000111A','+254700111222','sales@mrpolymers.co.ke', 5, 4.30),
 ('00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-0000000000d0',
  'Athi River Industrial Supplies','P052000222B','+254700333444','info@athisupplies.co.ke', 9, 3.80)
on conflict (id) do nothing;

insert into stock_items (id, org_id, sku, name, uom, reorder_level, reorder_qty, unit_cost, location) values
 ('00000000-0000-0000-0000-000000000051','00000000-0000-0000-0000-0000000000d0','PP-RESIN-25','PP Resin (25kg bag)','bag',  40, 100, 4200, 'Store A'),
 ('00000000-0000-0000-0000-000000000052','00000000-0000-0000-0000-0000000000d0','HDPE-25',    'HDPE Granules (25kg)','bag',  30,  80, 3950, 'Store A'),
 ('00000000-0000-0000-0000-000000000053','00000000-0000-0000-0000-0000000000d0','MASTERB-BLU','Masterbatch Blue (5kg)','tub', 15,  40, 2600, 'Store B'),
 ('00000000-0000-0000-0000-000000000054','00000000-0000-0000-0000-0000000000d0','STRETCH-FILM','Stretch Film Roll','roll',  25,  60,  850, 'Store B')
on conflict (id) do nothing;

-- Purchase request with two lines
insert into purchase_requests (id, org_id, pr_number, requested_by, department, status, needed_by) values
 ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000d0',
  'PR-2026-001','J. Mwangi','Production','rfq_sent', current_date + 7)
on conflict (id) do nothing;

insert into purchase_request_lines (org_id, pr_id, stock_item_id, description, qty, uom) values
 ('00000000-0000-0000-0000-0000000000d0','00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-000000000051','PP Resin (25kg bag)',100,'bag'),
 ('00000000-0000-0000-0000-0000000000d0','00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-000000000052','HDPE Granules (25kg)', 80,'bag');

-- Two competing quotations for the same PR (drives v_quote_comparison)
insert into quotations (id, org_id, pr_id, supplier_id, quote_number, status) values
 ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000d0','00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000a1','Q-MRP-889','shortlisted'),
 ('00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-0000000000d0','00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000a2','Q-ARI-204','received')
on conflict (id) do nothing;

insert into quotation_lines (org_id, quotation_id, stock_item_id, description, qty, unit_price) values
 ('00000000-0000-0000-0000-0000000000d0','00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-000000000051','PP Resin',100,4150),
 ('00000000-0000-0000-0000-0000000000d0','00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-000000000052','HDPE',      80,3900),
 ('00000000-0000-0000-0000-0000000000d0','00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-000000000051','PP Resin',100,4300),
 ('00000000-0000-0000-0000-0000000000d0','00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-000000000052','HDPE',      80,3850);

-- LPO issued to the cheaper supplier
insert into purchase_orders (id, org_id, lpo_number, supplier_id, quotation_id, status) values
 ('00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000d0','LPO-2026-001','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000e1','part_received')
on conflict (id) do nothing;

insert into purchase_order_lines (org_id, lpo_id, stock_item_id, description, qty, unit_price, qty_received) values
 ('00000000-0000-0000-0000-0000000000d0','00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-000000000051','PP Resin',100,4150,100),
 ('00000000-0000-0000-0000-0000000000d0','00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-000000000052','HDPE',      80,3900, 50);

-- GRN: goods received -> creates stock-in movements
insert into grns (id, org_id, grn_number, lpo_id, supplier_id, received_by) values
 ('00000000-0000-0000-0000-000000000091','00000000-0000-0000-0000-0000000000d0','GRN-2026-001','00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000a1','Store Clerk')
on conflict (id) do nothing;

insert into grn_lines (org_id, grn_id, stock_item_id, qty_received, uom) values
 ('00000000-0000-0000-0000-0000000000d0','00000000-0000-0000-0000-000000000091','00000000-0000-0000-0000-000000000051',100,'bag'),
 ('00000000-0000-0000-0000-0000000000d0','00000000-0000-0000-0000-000000000091','00000000-0000-0000-0000-000000000052', 50,'bag');

-- Stock ledger: receipts (in) + some issues to production (out).
-- Net effect leaves Masterbatch + Stretch Film BELOW reorder level so the
-- reorder-alert view lights up in the demo.
insert into stock_movements (org_id, stock_item_id, movement_type, qty, source_doc, source_id) values
 ('00000000-0000-0000-0000-0000000000d0','00000000-0000-0000-0000-000000000051','in', 100,'GRN','00000000-0000-0000-0000-000000000091'),
 ('00000000-0000-0000-0000-0000000000d0','00000000-0000-0000-0000-000000000052','in',  50,'GRN','00000000-0000-0000-0000-000000000091'),
 ('00000000-0000-0000-0000-0000000000d0','00000000-0000-0000-0000-000000000051','out', 72,'ISSUE',null),
 ('00000000-0000-0000-0000-0000000000d0','00000000-0000-0000-0000-000000000052','out', 28,'ISSUE',null),
 ('00000000-0000-0000-0000-0000000000d0','00000000-0000-0000-0000-000000000053','in',  20,'ADJUST',null),
 ('00000000-0000-0000-0000-0000000000d0','00000000-0000-0000-0000-000000000053','out', 12,'ISSUE',null),
 ('00000000-0000-0000-0000-0000000000d0','00000000-0000-0000-0000-000000000054','in',  30,'ADJUST',null),
 ('00000000-0000-0000-0000-0000000000d0','00000000-0000-0000-0000-000000000054','out', 9, 'ISSUE',null);

-- Supplier invoice (eTIMS-ready) + partial M-Pesa payment
insert into invoices (id, org_id, invoice_number, supplier_id, lpo_id, due_date,
                      subtotal, vat_amount, total_amount,
                      supplier_kra_pin, buyer_kra_pin, etims_status, payment_status) values
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000d0','INV-MRP-5567',
  '00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000f1', current_date + 30,
  610000, 97600, 707600, 'P052000111A','P051234567X','validated','part_paid')
on conflict (id) do nothing;

insert into payments (id, org_id, invoice_id, amount, method, mpesa_receipt, reconciled) values
 ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000d0','00000000-0000-0000-0000-0000000000b1',
  400000,'mpesa','TFH7XY12QK', true)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Anon (logged-out) READ-ONLY access, demo org ONLY.
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'orgs','suppliers','stock_items','purchase_requests','purchase_request_lines',
    'quotations','quotation_lines','purchase_orders','purchase_order_lines',
    'grns','grn_lines','invoices','payments','stock_movements']
  loop
    if t = 'orgs' then
      execute 'create policy demo_read on orgs for select to anon using (is_demo = true)';
    else
      execute format(
        'create policy demo_read on %I for select to anon
           using (org_id in (select id from orgs where is_demo = true));', t);
    end if;
  end loop;
end$$;

-- ============================================================================
-- End migration 002
-- ============================================================================
