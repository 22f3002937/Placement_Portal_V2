const AdminDrives = {
  name: 'AdminDrives',
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
        <div class="page-header">
          <h1 class="page-title">Placement Drives</h1>
          <div class="page-sub">Review and approve drives submitted by companies</div>
        </div>

        <div class="ppa-tabs">
          <div v-for="f in filters" :key="f.val" class="ppa-tab" :class="{active:filter===f.val}" @click="filter=f.val">
            {{ f.label }}
            <span style="color:var(--text-muted);font-size:.78rem;"> ({{ countFilter(f.val) }})</span>
          </div>
        </div>

        <div v-if="loading" class="text-center py-5"><span class="ppa-spinner" style="width:2rem;height:2rem;"></span></div>

        <div v-else class="ppa-card-flat">
          <div class="table-responsive">
            <table class="ppa-table">
              <thead>
                <tr><th>Drive</th><th>Company</th><th>Eligibility</th><th>Deadline</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                <tr v-for="d in filtered" :key="d.id">
                  <td>
                    <div style="font-weight:600;">{{ d.job_title }}</div>
                    <div style="color:var(--text-muted);font-size:.78rem;">Min CGPA: {{ d.min_cgpa }}</div>
                  </td>
                  <td>{{ d.company_name }}</td>
                  <td style="font-size:.85rem;">
                    <div>{{ d.eligible_branches?.join(', ') || 'All' }}</div>
                    <div style="color:var(--text-muted);">Year: {{ d.eligible_year || 'Any' }}</div>
                  </td>
                  <td style="font-size:.85rem;color:var(--text-muted);">{{ d.application_deadline }}</td>
                  <td><span class="badge-ppa" :class="'badge-'+d.status">{{ d.status }}</span></td>
                  <td>
                    <div class="d-flex gap-1 flex-wrap">
                      <button v-if="d.status==='pending'" class="btn-ppa btn-sm-ppa" @click="updateStatus(d,'approve')">Approve</button>
                      <button v-if="d.status==='pending'" class="btn-ppa-danger btn-sm-ppa" @click="updateStatus(d,'reject')">Reject</button>
                      <button class="btn-ppa-outline btn-sm-ppa" @click="viewApps(d)">
                        <i class="bi bi-eye me-1"></i>Applications
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="!filtered.length">
                  <td colspan="6"><div class="empty-state"><i class="bi bi-briefcase"></i><p>No drives found</p></div></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Applications Modal -->
        <transition name="fade">
          <div v-if="appsModal" class="ppa-modal-backdrop" @click.self="appsModal=null">
            <div class="ppa-modal" style="max-width:680px;">
              <div class="ppa-modal-header">
                <span class="ppa-modal-title">Applications — {{ appsModal.title }}</span>
                <button class="btn-close-ppa" @click="appsModal=null"><i class="bi bi-x-lg"></i></button>
              </div>
              <div v-if="appsLoading" class="text-center py-4"><span class="ppa-spinner"></span></div>
              <table v-else class="ppa-table">
                <thead><tr><th>Student</th><th>Branch</th><th>CGPA</th><th>Status</th><th>Interview</th></tr></thead>
                <tbody>
                  <tr v-for="a in appsModal.apps" :key="a.id">
                    <td>{{ a.student_name }}</td>
                    <td>{{ a.student_branch }}</td>
                    <td>{{ a.student_cgpa }}</td>
                    <td><span class="badge-ppa" :class="'badge-'+a.status">{{ a.status }}</span></td>
                    <td style="font-size:.82rem;color:var(--text-muted);">
                      {{ a.interview_date || '—' }}
                    </td>
                  </tr>
                  <tr v-if="!appsModal.apps.length">
                    <td colspan="5"><div class="empty-state"><i class="bi bi-inbox"></i><p>No applications yet</p></div></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </transition>
      </main>
    </div>
  `,
  setup() {
    const drives = Vue.ref([]);
    const loading = Vue.ref(true);
    const filter = Vue.ref('all');
    const appsModal = Vue.ref(null);
    const appsLoading = Vue.ref(false);

    const filters = [
      { val: 'all', label: 'All' },
      { val: 'pending', label: 'Pending' },
      { val: 'approved', label: 'Approved' },
      { val: 'closed', label: 'Closed' },
    ];

    const filtered = Vue.computed(() => {
      if (filter.value === 'all') return drives.value;
      return drives.value.filter(d => d.status === filter.value);
    });

    function countFilter(val) {
      if (val === 'all') return drives.value.length;
      return drives.value.filter(d => d.status === val).length;
    }

    async function load() {
      loading.value = true;
      try { drives.value = await api.get('/admin/drives'); }
      catch (e) { showToast(e.message, 'error'); }
      finally { loading.value = false; }
    }

    async function updateStatus(d, action) {
      try {
        await api.patch(`/admin/drives/${d.id}/status`, { action });
        showToast(`Drive ${action}d`);
        await load();
      } catch (e) { showToast(e.message, 'error'); }
    }

    async function viewApps(d) {
      appsModal.value = { title: d.job_title, apps: [] };
      appsLoading.value = true;
      try {
        appsModal.value.apps = await api.get(`/admin/drives/${d.id}/applications`);
      } catch (e) { showToast(e.message, 'error'); }
      finally { appsLoading.value = false; }
    }

    load();
    return { drives, loading, filter, filters, filtered, countFilter, appsModal, appsLoading, updateStatus, viewApps };
  },
};
