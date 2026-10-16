/* Admins: who can use this panel. Only owners can change it. */
import { sb, q, rpc } from '../sb.js';
import { $, $$, esc, pageHead, field, showErrors, val, toast, modal, confirmDialog, fmtDate } from '../ui.js';

export async function render(root, _params, ctx) {
  const admins = await rpc('admin_list_admins');
  const owner = ctx.me.role === 'owner';
  root.innerHTML = `
    ${pageHead({ title: 'Admins', sub: 'People who can sign in here. Owners can also manage admins; admins can do everything else.', actions: owner ? '<button class="btn btn--gold" data-add>+ Add admin</button>' : '' })}
    <section class="card card--flush"><div class="table-wrap"><table class="responsive">
      <thead><tr><th>Email</th><th>Role</th><th>Since</th><th></th></tr></thead><tbody>
      ${admins.map((a) => `<tr>
        <td class="cell-main">${esc(a.email)}${a.userId === ctx.me.userId ? ' <span class="muted">(you)</span>' : ''}</td>
        <td>${a.role === 'owner' ? '<span class="badge badge--ok">Owner</span>' : '<span class="badge">Admin</span>'}</td>
        <td data-label="Since">${fmtDate(a.since)}</td>
        <td class="actions">${owner ? `<button class="btn btn--outline btn--sm" data-role="${a.userId}" data-to="${a.role === 'owner' ? 'admin' : 'owner'}">${a.role === 'owner' ? 'Make admin' : 'Make owner'}</button>
          <button class="btn btn--danger btn--sm" data-remove="${a.userId}">Remove</button>` : ''}</td></tr>`).join('')}
      </tbody></table></div></section>
    <section class="card" style="margin-top:16px"><div class="card__head"><h2>Adding someone new</h2></div>
      <ol style="margin:0;padding-left:20px;display:grid;gap:6px">
        <li>In Supabase, open <strong>Authentication → Users → Add user → Create new user</strong>, enter their email and a temporary password, and keep “Auto confirm” ticked.</li>
        <li>Here, click <strong>Add admin</strong> and enter the same email.</li>
        <li>Send them the link to this page and the temporary password. They can change it under <strong>Store settings → My password</strong>.</li>
      </ol>
      ${owner ? '' : '<p class="muted" style="margin-top:10px">Only an owner can add or remove admins.</p>'}
    </section>`;
  if (!owner) return;

  const again = () => render(root, _params, ctx);
  $('[data-add]', root).addEventListener('click', () => modal({
    title: 'Add admin',
    body: `<form class="form" data-add-form novalidate>
      ${field({ name: 'email', label: 'Their email', type: 'email', hint: 'The account must already exist in Supabase (see the steps below the list).' })}
      ${field({ name: 'role', label: 'Role', value: 'admin', options: [{ value: 'admin', label: 'Admin — runs the store' }, { value: 'owner', label: 'Owner — also manages admins' }] })}
    </form>`,
    actions: [{ label: 'Cancel', value: false }, {
      label: 'Add', cls: 'btn--gold', onClick: async (wrap) => {
        const form = $('[data-add-form]', wrap);
        const email = val(form, 'email');
        if (!showErrors(form, { email: /^\S+@\S+\.\S+$/.test(email) ? '' : 'Enter their email.' })) return false;
        await rpc('admin_add_admin', { p_email: email, p_role: form.role.value });
        toast(`${email} can now use the admin panel.`, { tone: 'ok' });
        again();
        return true;
      },
    }],
  }));
  $$('[data-role]', root).forEach((b) => b.addEventListener('click', async () => {
    const a = admins.find((x) => x.userId === b.dataset.role);
    if (!(await confirmDialog(b.dataset.to === 'owner' ? 'Make owner?' : 'Make admin?', b.dataset.to === 'owner' ? `${esc(a.email)} will also be able to add and remove admins.` : `${esc(a.email)} will no longer manage admins.`))) return;
    try { await q(sb.from('admin_users').update({ role: b.dataset.to }).eq('user_id', a.userId)); toast('Role updated.', { tone: 'ok' }); again(); } catch (err) { toast(err.message, { tone: 'err' }); }
  }));
  $$('[data-remove]', root).forEach((b) => b.addEventListener('click', async () => {
    const a = admins.find((x) => x.userId === b.dataset.remove);
    const self = a.userId === ctx.me.userId;
    if (!(await confirmDialog(`Remove ${esc(a.email)}?`, self ? 'You will lose access to this panel straight away.' : 'They won’t be able to sign in to the admin panel any more. Their account itself stays in Supabase.', { ok: 'Remove', danger: true }))) return;
    try {
      await q(sb.from('admin_users').delete().eq('user_id', a.userId));
      toast('Removed.', { tone: 'ok' });
      if (self) location.reload(); else again();
    } catch (err) { toast(err.message, { tone: 'err' }); }
  }));
}
