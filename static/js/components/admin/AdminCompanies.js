const AdminCompanies = {
  name: 'AdminCompanies',
  template: `
    <div class="ppa-layout">
      <aside class="ppa-sidebar">
        <div class="sidebar-section">Overview</div>
        <router-link to="/admin" class="sidebar-link" active-class="active" exact><i class="bi bi-grid-1x2"></i> Dashboard</router-link>
        <div class="sidebar-section">Manage</div>
        <router-link to="/admin/companies" class="sidebar-link" active-class="active"><i class="bi bi-building"></i> Companies</router-link>
        <router-link to="/admin/students"  class="sidebar-link" active-class="active"><i class="bi bi-people"></i> Students</router-link>
        <router-link to="/admin/drives"    class="sidebar-link" active-class="active"><i class="bi bi-briefcase"></i> Drives</router-link>
      </aside>

      <main class="ppa-main">
        <div class="page-header d-flex justify-content-between align-items-start">
          <div>
            <h1 class="page-title">Companies</h1>
            <div class="page-sub">Manage company registrations</div>
          </div>
        </div>

        <!-- Filter tabs -->
        <div class="ppa-tabs">
          <div v-for="f in filters" :key="f.val" class="ppa-tab" :class="{active:filter===f.val}" @click="filter=f.val">
            {{ f.label }} <span style="color:var(--text-muted);font-size:.78rem;"> ({{ countFilter(f.val) }})</span>
          </div>
        </div>

        <div v-if="loading" class="text-center py-5"><span class="ppa-spinner" style="width:2rem;height:2rem;"></span></div>

        <div v-else class="ppa-card-flat">
          <div class="table-responsive">
            <table class="ppa-table">
              <thead>
                <tr>
                  <th>Company</th><th>Email</th><th>HR Contact</th>
                  <th>Status</th><th>Blacklisted</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in filtered" :key="c.id">
                  <td>
                    <div style="font-weight:600;">{{ c.company_name }}</div>
                    <div style="color:var(--text-muted);font-size:.8rem;">
                      <a :href="c.website" target="_blank" style="color:var(--accent);">{{ c.website }}</a>
                    </div>
                  </td>
                  <td style="color:var(--text-muted);">{{ c.company_email }}</td>
                  <td>{{ c.hr_contact }}</td>
                  <td><span class="badge-ppa" :class="'badge-'+c.approval_status">{{ c.approval_status }}</span></td>
                  <td>
                    <span v-if="c.is_blacklisted" class="badge-ppa badge-blacklisted">Yes</span>
                    <span v-else style="color:var(--text-muted);font-size:.85rem;">—</span>
                  </td>
                  <td>
                    <div class="d-flex gap-1 flex-wrap">
                      <button v-if="c.approval_status==='pending'" class="btn-ppa btn-sm-ppa" @click="updateStatus(c,'approve')">Approve</button>
                      <button v-if="c.approval_status==='pending'" class="btn-ppa-danger btn-sm-ppa" @click="updateStatus(c,'reject')">Reject</button>
                      <button class="btn-ppa-outline btn-sm-ppa" @click="openEdit(c)">Edit</button>
                      <button class="btn-ppa-danger btn-sm-ppa" @click="toggleBlacklist(c)">
                        {{ c.is_blacklisted ? 'Unblacklist' : 'Blacklist' }}
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="!filtered.length">
                  <td colspan="6"><div class="empty-state"><i class="bi bi-building"></i><p>No companies found</p></div></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Edit Modal -->
        <transition name="fade">
          <div v-if="editModal" class="ppa-modal-backdrop" @click.self="editModal=null">
            <div class="ppa-modal">
              <div class="ppa-modal-header">
                <span class="ppa-modal-title">Edit Company</span>
                <button class="btn-close-ppa" @click="editModal=null"><i class="bi bi-x-lg"></i></button>
              </div>
              <div class="row g-3">
                <div class="col-12">
                  <label class="ppa-label">Company Name</label>
                  <input v-model="editModal.name" class="ppa-input"/>
                </div>
                <div class="col-12">
                  <label class="ppa-label">HR Contact</label>
                  <input v-model="editModal.hr_contact" class="ppa-input"/>
                </div>
                <div class="col-12">
                  <label class="ppa-label">Website</label>
                  <input v-model="editModal.website" class="ppa-input"/>
                </div>
              </div>
              <div class="d-flex gap-2 mt-4 justify-content-end">
                <button class="btn-ppa-outline" @click="editModal=null">Cancel</button>
                <button class="btn-ppa" @click="saveEdit">Save Changes</button>
              </div>
            </div>
          </div>
        </transition>
      </main>
    </div>
  `,
  setup() {
    const companies = Vue.ref([]);
    const loading = Vue.ref(true);
    const filter = Vue.ref('all');
    const editModal = Vue.ref(null);
    const filters = [
      { val: 'all', label: 'All' },
      { val: 'pending', label: 'Pending' },
      { val: 'approved', label: 'Approved' },
      { val: 'rejected', label: 'Rejected' },
    ];

    const filtered = Vue.computed(() => {
      if (filter.value === 'all') return companies.value;
      return companies.value.filter(c => c.approval_status === filter.value);
    });

    function countFilter(val) {
      if (val === 'all') return companies.value.length;
      return companies.value.filter(c => c.approval_status === val).length;
    }

    async function load() {
      loading.value = true;
      try { companies.value = await api.get('/admin/companies'); }
      catch (e) { showToast(e.message, 'error'); }
      finally { loading.value = false; }
    }

    async function updateStatus(c, action) {
      try {
        await api.patch(`/admin/companies/${c.id}/status`, { action });
        showToast(`Company ${action}d`);
        await load();
      } catch (e) { showToast(e.message, 'error'); }
    }

    async function toggleBlacklist(c) {
      try {
        const res = await api.patch(`/admin/companies/${c.id}/blacklist`);
        showToast(res.message);
        await load();
      } catch (e) { showToast(e.message, 'error'); }
    }

    function openEdit(c) {
      editModal.value = { id: c.id, name: c.company_name, hr_contact: c.hr_contact, website: c.website };
    }

    async function saveEdit() {
      try {
        await api.put(`/admin/companies/${editModal.value.id}`, editModal.value);
        showToast('Company updated');
        editModal.value = null;
        await load();
      } catch (e) { showToast(e.message, 'error'); }
    }

    load();
    return { companies, loading, filter, filters, filtered, countFilter, editModal, updateStatus, toggleBlacklist, openEdit, saveEdit };
  },
};
