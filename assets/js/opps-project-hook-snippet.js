// Add this inside opps.js and call it after a status update or save when status becomes "Won".

async function ensureProjectForOpportunity(rec) {
  if (!window.sb || !rec || String(rec.status || '').toLowerCase() !== 'won') return;

  if (rec.converted_project_id) return;

  const payload = {
    name: rec.opportunity || rec.name || 'New Project',
    client_name: rec.name || '',
    opportunity_id: rec.id,
    contract_value: Number(rec.value || 0),
    status: 'Active',
  };

  const { data: project, error: createErr } = await sb
    .from('projects')
    .insert(payload)
    .select('id')
    .single();

  if (createErr) {
    console.error('[opps -> projects] failed to create project:', createErr);
    return;
  }

  const { error: linkErr } = await sb
    .from('opportunities')
    .update({ converted_project_id: project.id })
    .eq('id', rec.id);

  if (linkErr) console.error('[opps -> projects] failed to link project back to opportunity:', linkErr);
}
