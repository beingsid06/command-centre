import { db, addLog, getNextCallbackId, calcDeadline, detectCategory, postFreshdeskNote } from './lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, ...body } = req.body;
  if (!action) return res.status(400).json({ error: 'action required' });

  try {
    switch (action) {

      case 'pickup': {
        const { id, agent } = body;
        if (!id || !agent) return res.status(400).json({ error: 'id and agent required' });
        const now = new Date().toISOString();
        const { data: cb } = await db.from('callbacks').select('*').eq('id', id).single();
        if (!cb) return res.status(404).json({ error: 'Callback not found' });
        if (cb.status !== 'pending' && cb.status !== 'assigned') return res.status(400).json({ error: 'Can only pick up pending or assigned callbacks' });
        const { error } = await db.from('callbacks').update({ status: 'in-progress', assigned_agent: agent, picked_up_at: now }).eq('id', id);
        if (error) return res.status(500).json({ error: error.message });
        await addLog(id, 'picked_up', agent, `${agent} picked up ${id}`);
        return res.status(200).json({ success: true });
      }

      case 'complete': {
        const { id, notes, followUpRequired, followUpAt } = body;
        if (!id) return res.status(400).json({ error: 'id required' });
        const now = new Date().toISOString();
        const { data: cb } = await db.from('callbacks').select('*').eq('id', id).single();
        if (!cb) return res.status(404).json({ error: 'Callback not found' });
        if (cb.status !== 'in-progress') return res.status(400).json({ error: 'Only in-progress callbacks can be completed' });
        const { error } = await db.from('callbacks').update({ status: 'completed', completed_at: now, notes: notes || '', follow_up_required: followUpRequired || false, follow_up_at: followUpAt || null }).eq('id', id);
        if (error) return res.status(500).json({ error: error.message });
        await addLog(id, 'completed', cb.assigned_agent, `${cb.assigned_agent} completed ${id}`);

        // Post private note to Freshdesk
        if (cb.ticket_id) {
          const isFollowUp = followUpRequired === true || followUpRequired === 'true';
          const noteHtml = `<b>Callback Summary</b><br>` +
            `<b>Callback ID:</b> ${id}<br>` +
            `<b>Agent:</b> ${cb.assigned_agent || 'Unknown'}<br>` +
            `<b>Status:</b> Completed<br>` +
            `<b>Notes:</b> ${notes || 'N/A'}<br>` +
            `<b>Follow-up Needed:</b> ${isFollowUp ? 'Yes' : 'No'}` +
            (isFollowUp && followUpAt ? `<br><b>Follow-up Date:</b> ${new Date(followUpAt).toLocaleString()}` : '');
          postFreshdeskNote(cb.ticket_id, noteHtml);
        }

        return res.status(200).json({ success: true });
      }

      case 'followup': {
        const { id, followUpAt, notes } = body;
        if (!id || !followUpAt) return res.status(400).json({ error: 'id and followUpAt required' });
        const now = new Date().toISOString();
        const { data: cb } = await db.from('callbacks').select('*').eq('id', id).single();
        if (!cb) return res.status(404).json({ error: 'Callback not found' });
        await db.from('callbacks').update({ status: 'completed', completed_at: now, notes: notes || '', follow_up_required: true, follow_up_at: followUpAt }).eq('id', id);
        const newId = await getNextCallbackId();
        const { error } = await db.from('callbacks').insert({
          id: newId, ticket_id: cb.ticket_id, customer_name: cb.customer_name, ticket_link: cb.ticket_link,
          subject: cb.subject, category: cb.category, type: cb.type, created_at: now,
          promised_hours: cb.promised_hours, deadline: followUpAt, status: 'pending',
          parent_callback_id: id, freshdesk_agent: cb.freshdesk_agent,
        });
        if (error) return res.status(500).json({ error: error.message });
        await addLog(id, 'completed', cb.assigned_agent || 'Agent', `${cb.assigned_agent || 'Agent'} completed ${id} (follow-up)`);
        await addLog(newId, 'created', '', `Follow-up callback from ${id}`);

        // Post private note to Freshdesk
        if (cb.ticket_id) {
          const noteHtml = `<b>Callback Summary</b><br>` +
            `<b>Callback ID:</b> ${id}<br>` +
            `<b>Agent:</b> ${cb.assigned_agent || 'Unknown'}<br>` +
            `<b>Status:</b> Completed (Follow-up)<br>` +
            `<b>Notes:</b> ${notes || 'N/A'}<br>` +
            `<b>Follow-up Needed:</b> Yes<br>` +
            `<b>Follow-up Date:</b> ${new Date(followUpAt).toLocaleString()}<br>` +
            `<b>New Callback ID:</b> ${newId}`;
          postFreshdeskNote(cb.ticket_id, noteHtml);
        }

        return res.status(200).json({ success: true, newId });
      }

      case 'force-release': {
        const { id, notes } = body;
        if (!id || !notes) return res.status(400).json({ error: 'id and notes required' });
        const now = new Date().toISOString();
        const { data: cb } = await db.from('callbacks').select('*').eq('id', id).single();
        if (!cb || cb.status !== 'in-progress') return res.status(400).json({ error: 'Only in-progress callbacks can be force-released' });
        const newNotes = (cb.force_release_notes ? cb.force_release_notes + '\n---\n' : '') + now + ': ' + notes;
        await db.from('callbacks').update({ status: 'pending', assigned_agent: null, picked_up_at: null, force_release_count: (cb.force_release_count || 0) + 1, force_release_notes: newNotes }).eq('id', id);
        await addLog(id, 'force_release', 'Supervisor', `Force-released ${id} from ${cb.assigned_agent} — ${notes}`);
        return res.status(200).json({ success: true });
      }

      case 'auto-release': {
        const { id } = body;
        if (!id) return res.status(400).json({ error: 'id required' });
        const { data: cb } = await db.from('callbacks').select('*').eq('id', id).single();
        if (!cb || cb.status !== 'in-progress') return res.status(400).json({ error: 'Not in-progress' });
        await db.from('callbacks').update({ status: 'pending', assigned_agent: null, picked_up_at: null, auto_release_count: (cb.auto_release_count || 0) + 1 }).eq('id', id);
        await addLog(id, 'auto_release', cb.assigned_agent, `Auto-released ${id} (30m timeout)`);
        return res.status(200).json({ success: true });
      }

      case 'assign': {
        const { id, agent } = body;
        if (!id || !agent) return res.status(400).json({ error: 'id and agent required' });
        await db.from('callbacks').update({ status: 'assigned', assigned_agent: agent }).eq('id', id);
        await addLog(id, 'assigned', 'Supervisor', `Assigned ${id} to ${agent}`);
        return res.status(200).json({ success: true });
      }

      case 'bulk-assign': {
        const { ids, agent } = body;
        if (!ids?.length || !agent) return res.status(400).json({ error: 'ids and agent required' });
        for (const id of ids) {
          await db.from('callbacks').update({ status: 'assigned', assigned_agent: agent }).eq('id', id).eq('status', 'pending');
          await addLog(id, 'assigned', 'Supervisor', `Bulk assigned ${id} to ${agent}`);
        }
        return res.status(200).json({ success: true, count: ids.length });
      }

      case 'unassign': {
        const { id } = body;
        if (!id) return res.status(400).json({ error: 'id required' });
        const { data: cb } = await db.from('callbacks').select('*').eq('id', id).single();
        if (!cb || (cb.status !== 'assigned' && cb.status !== 'in-progress'))
          return res.status(400).json({ error: 'Can only unassign assigned or in-progress callbacks' });
        await db.from('callbacks').update({ status: 'pending', assigned_agent: null, picked_up_at: null }).eq('id', id);
        await addLog(id, 'unassigned', 'Supervisor', `Unassigned ${id} from ${cb.assigned_agent}`);
        return res.status(200).json({ success: true });
      }

      case 'reassign': {
        const { id, agent } = body;
        if (!id || !agent) return res.status(400).json({ error: 'id and agent required' });
        const { data: cb } = await db.from('callbacks').select('*').eq('id', id).single();
        if (!cb || (cb.status !== 'assigned' && cb.status !== 'in-progress'))
          return res.status(400).json({ error: 'Can only reassign assigned or in-progress callbacks' });
        await db.from('callbacks').update({ status: 'assigned', assigned_agent: agent, picked_up_at: null }).eq('id', id);
        await addLog(id, 'reassigned', 'Supervisor', `Reassigned ${id} from ${cb.assigned_agent} to ${agent}`);
        return res.status(200).json({ success: true });
      }

      case 'extend': {
        const { id } = body;
        if (!id) return res.status(400).json({ error: 'id required' });
        const { data: cb } = await db.from('callbacks').select('*').eq('id', id).single();
        if (!cb || cb.status !== 'in-progress') return res.status(400).json({ error: 'Only in-progress callbacks can be extended' });
        if ((cb.extend_count || 0) >= 3) return res.status(400).json({ error: 'Maximum 3 extensions reached' });
        const now = new Date().toISOString();
        const newCount = (cb.extend_count || 0) + 1;
        await db.from('callbacks').update({ picked_up_at: now, extend_count: newCount }).eq('id', id);
        await addLog(id, 'extended', cb.assigned_agent, `${cb.assigned_agent} extended timer (${newCount}/3)`);
        return res.status(200).json({ success: true, extendCount: newCount });
      }

      case 'bulk-force-release': {
        const { ids, notes } = body;
        if (!ids?.length || !notes) return res.status(400).json({ error: 'ids and notes required' });
        const now = new Date().toISOString();
        for (const id of ids) {
          const { data: cb } = await db.from('callbacks').select('*').eq('id', id).single();
          if (cb && cb.status === 'in-progress') {
            const newNotes = (cb.force_release_notes ? cb.force_release_notes + '\n---\n' : '') + now + ': ' + notes;
            await db.from('callbacks').update({ status: 'pending', assigned_agent: null, picked_up_at: null, force_release_count: (cb.force_release_count || 0) + 1, force_release_notes: newNotes }).eq('id', id);
            await addLog(id, 'force_release', 'Supervisor', `Bulk force-released ${id} from ${cb.assigned_agent} — ${notes}`);
          }
        }
        return res.status(200).json({ success: true, count: ids.length });
      }

      case 'create': {
        const { ticketId, customerName, subject, type, category, promisedHours } = body;
        if (!ticketId || !customerName || !subject) return res.status(400).json({ error: 'ticketId, customerName, subject required' });
        const now = new Date().toISOString();
        const hours = parseFloat(promisedHours) || 24;
        const id = await getNextCallbackId();
        const tid = ticketId.toString().replace(/\D/g, '');
        const { error } = await db.from('callbacks').insert({
          id, ticket_id: 'FD-' + tid, customer_name: customerName,
          ticket_link: `https://scapia-support.freshdesk.com/a/tickets/${tid}`,
          subject, category: category || detectCategory(subject),
          type: type || 'Normal Callback Request', created_at: now,
          promised_hours: hours, deadline: calcDeadline(now, hours), status: 'pending',
        });
        if (error) return res.status(500).json({ error: error.message });
        await addLog(id, 'created', '', `Manual callback created: ${subject}`);
        return res.status(200).json({ success: true, id, message: `Callback ${id} created` });
      }

      case 'bulk-create': {
        const { callbacks } = body;
        if (!callbacks?.length) return res.status(400).json({ error: 'callbacks array required' });
        const now = new Date().toISOString();
        let created = 0;
        for (const c of callbacks) {
          try {
            const id = await getNextCallbackId();
            const tid = (c.ticketId || '').toString().replace(/\D/g, '');
            const hours = parseFloat(c.promisedHours) || 24;
            await db.from('callbacks').insert({
              id, ticket_id: 'FD-' + tid, customer_name: c.customerName || '',
              ticket_link: `https://scapia-support.freshdesk.com/a/tickets/${tid}`,
              subject: c.subject || '', category: c.category || detectCategory(c.subject),
              type: c.type || 'Normal Callback Request', created_at: now,
              promised_hours: hours, deadline: calcDeadline(now, hours), status: 'pending',
            });
            await addLog(id, 'created', '', `Bulk created: ${c.subject || id}`);
            created++;
          } catch (e) { /* skip failed rows */ }
        }
        return res.status(200).json({ success: true, message: `${created} callbacks created` });
      }

      case 'clear-old': {
        const { beforeDate } = body;
        if (!beforeDate) return res.status(400).json({ error: 'beforeDate required' });
        const { data: rows } = await db.from('callbacks').select('id').eq('status', 'completed').lt('completed_at', beforeDate);
        const count = rows?.length || 0;
        const { error } = await db.from('callbacks').delete().eq('status', 'completed').lt('completed_at', beforeDate);
        if (error) return res.status(500).json({ error: error.message });
        await addLog('-', 'clear_old', 'Admin', `Cleared ${count} old callbacks before ${new Date(beforeDate).toLocaleDateString()}`);
        return res.status(200).json({ success: true, count });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
