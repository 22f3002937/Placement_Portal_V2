const StudentDashboard = {
  name: 'StudentDashboard',
  template: `
    <div class="ppa-layout">
      <aside class="ppa-sidebar">
        <div class="sidebar-section">Student</div>
        <router-link to="/student" class="sidebar-link" active-class="active" exact><i class="bi bi-grid-1x2"></i> Dashboard</router-link>
        <router-link to="/student/history" class="sidebar-link" active-class="active"><i class="bi bi-trophy"></i> Placement History</router-link>
        <router-link to="/student/profile" class="sidebar-link" active-class="active"><i class="bi bi-person-gear"></i> Profile</router-link>
      </aside>

      <main class="ppa-main">
        <div v-if="loading" class="text-center py-5"><span class="ppa-spinner" style="width:2rem;height:2rem;"></span></div>
        <div v-else>
          <!-- Header -->
          <div class="page-header d-flex justify-content-between align-items-start">
            <div>
              <h1 class="page-title">Welcome, {{ data.student?.name?.split(' ')[0] }}</h1>
              <div class="page-sub">{{ data.student?.branch }} · CGPA {{ data.student?.cgpa }} · Class of {{ data.student?.graduation_year }}</div>
            </div>
            <button class="btn-ppa-outline" @click="exportCSV" :disabled="exporting">
              <i class="bi bi-download me-1"></i>
              {{ exporting ? 'Exporting...' : 'Export History' }}
            </button>
          </div>

          <!-- My Applications summary -->
          <div class="row g-3 mb-4">
            <div class="col-6 col-md-3" v-for="stat in appStats" :key="stat.label">
              <div class="stat-card">
                <div class="stat-value" :style="stat.color ? 'color:'+stat.color : ''">{{ stat.count }}</div>
                <div class="stat-label">{{ stat.label }}</div>
              </div>
            </div>
          </div>

          <!-- Drives -->
          <div class="d-flex align-items-center justify-content-between mb-3">
            <h5 style="margin:0;">Available Drives</h5>
            <div class="d-flex gap-2">
              <div class="search-wrap">
                <i class="bi bi-search"></i>
                <input v-model="search" class="ppa-input" placeholder="Search drives..." style="min-width:220px;"/>
              </div>
              <select v-model="eligFilter" class="ppa-select" style="width:auto;">
                <option value="all">All Drives</option>
                <option value="eligible">Eligible Only</option>
              </select>
            </div>
          </div>

          <div v-if="filteredDrives.length === 0" class="empty-state">
            <i class="bi bi-briefcase"></i>
            <p>No drives available matching your filters.</p>
          </div>
          <div class="row g-3">
            <div class="col-md-6 col-lg-4" v-for="d in filteredDrives" :key="d.id">
              <div class="drive-card">
                <div class="drive-company"><i class="bi bi-building me-1"></i>{{ d.company_name }}</div>
                <div class="drive-title">{{ d.job_title }}</div>
                <div class="d-flex gap-2 flex-wrap mb-3">
                  <span v-if="d.is_eligible" class="badge-ppa badge-approved" style="font-size:.72rem;">
                    <i class="bi bi-check-lg me-1"></i>Eligible
                  </span>
                  <span v-else class="badge-ppa badge-rejected" style="font-size:.72rem;">
                    <i class="bi bi-x-lg me-1"></i>Not Eligible
                  </span>
                  <span v-if="d.already_applied" class="badge-ppa badge-applied" style="font-size:.72rem;">Applied</span>
                </div>
                <div style="font-size:.8rem;color:var(--text-muted);" class="mb-3">
                  <div><i class="bi bi-star me-1"></i>Min CGPA: {{ d.min_cgpa || '—' }}</div>
                  <div><i class="bi bi-diagram-3 me-1"></i>Branches: {{ d.eligible_branches?.join(', ') || 'All' }}</div>
                  <div :style="d.deadline_passed ? 'color:var(--danger)' : ''">
                    <i class="bi bi-calendar-event me-1"></i>Deadline: {{ d.application_deadline }}
                  </div>
                </div>
                <div class="d-flex gap-2">
                  <span v-if="d.already_applied"
                    class="btn-sm-ppa flex-grow-1 text-center"
                    class="badge-ppa badge-applied">
                    <i class="bi bi-check-lg me-1"></i>Applied
                  </span>
                  <button v-else-if="!d.deadline_passed && d.is_eligible"
                    class="btn-ppa btn-sm-ppa flex-grow-1"
                    @click="apply(d)" :disabled="applying===d.id">
                    <span v-if="applying===d.id"><span class="ppa-spinner" style="width:.8rem;height:.8rem;border-width:2px;vertical-align:middle;"></span></span>
                    <span v-else>Apply Now</span>
                  </button>
                  <button v-else-if="d.deadline_passed" class="btn-sm-ppa flex-grow-1"
                    style="background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-muted);border-radius:6px;cursor:default;" disabled>
                    Deadline Passed
                  </button>
                  <button v-else class="btn-sm-ppa flex-grow-1"
                    style="background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-muted);border-radius:6px;cursor:default;" disabled>
                    Not Eligible
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Export History panel -->
          <div class="ppa-card mb-4">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <h6 class="mb-0" style="color:var(--accent);">
                <i class="bi bi-file-earmark-zip me-2"></i>Export History
              </h6>
            </div>
            <div v-if="!exports.length" style="color:var(--text-muted);font-size:.9rem;">
              No exports yet. Click "Export History" above to generate a CSV of your applications.
            </div>
            <div v-else class="table-responsive">
              <table class="ppa-table w-100">
                <thead><tr>
                  <th>#</th><th>Requested At</th><th>Status</th><th>Action</th>
                </tr></thead>
                <tbody>
                  <tr v-for="(ex, i) in exports" :key="ex.id">
                    <td>{{ i + 1 }}</td>
                    <td style="color:var(--text-muted);font-size:.85rem;">{{ ex.created_at }}</td>
                    <td>
                      <span class="badge-ppa"
                        :class="ex.status==='done' ? 'badge-approved' : ex.status==='failed' ? 'badge-rejected' : 'badge-pending'">
                        {{ ex.status }}
                      </span>
                    </td>
                    <td>
                      <a v-if="ex.status==='done'"
                        :href="'/api/student/export/download/' + ex.id"
                        class="btn-ppa btn-sm-ppa text-decoration-none"
                        download>
                        <i class="bi bi-file-earmark-arrow-down me-1"></i>Download
                      </a>
                      <span v-else style="color:var(--text-muted);font-size:.82rem;">
                        {{ ex.status === 'pending' ? 'Processing...' : 'Unavailable' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- My Applications table -->
          <div class="mt-4 ppa-card-flat">
            <h5 class="mb-3">My Applications</h5>
            <table class="ppa-table">
              <thead><tr><th>Company</th><th>Job Title</th><th>Status</th><th>Applied</th><th>Interview</th><th></th></tr></thead>
              <tbody>
                <tr v-for="a in data.applications" :key="a.id">
                  <td>{{ a.company_name }}</td>
                  <td style="font-weight:600;">{{ a.job_title }}</td>
                  <td><span class="badge-ppa" :class="'badge-'+a.status">{{ a.status }}</span></td>
                  <td style="color:var(--text-muted);font-size:.83rem;">{{ a.applied_on?.slice(0,10) }}</td>
                  <td style="font-size:.83rem;">
                    <span v-if="a.interview_date" style="color:var(--info);">{{ a.interview_date }}</span>
                    <span v-else style="color:var(--text-muted);">—</span>
                  </td>
                  <td>
                    <router-link :to="'/student/application/'+a.id" class="btn-ppa-outline btn-sm-ppa" style="text-decoration:none;">Detail</router-link>
                  </td>
                </tr>
                <tr v-if="!data.applications?.length">
                  <td colspan="6"><div class="empty-state"><i class="bi bi-inbox"></i><p>No applications yet</p></div></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  `,
  setup() {
    const data = Vue.ref({ student: null, drives: [], applications: [] });
    const loading = Vue.ref(true);
    const search = Vue.ref('');
    const eligFilter = Vue.ref('all');
    const applying = Vue.ref(null);
    const exporting = Vue.ref(false);
    const exports = Vue.ref([]);

    const filteredDrives = Vue.computed(() => {
      let list = data.value.drives || [];
      if (eligFilter.value === 'eligible') list = list.filter(d => d.is_eligible);
      if (search.value) {
        const q = search.value.toLowerCase();
        list = list.filter(d => d.job_title.toLowerCase().includes(q) || d.company_name.toLowerCase().includes(q));
      }
      return list;
    });

    const appStats = Vue.computed(() => {
      const apps = data.value.applications || [];
      return [
        { label: 'Applied', count: apps.length },
        { label: 'Shortlisted', count: apps.filter(a => a.status === 'shortlisted').length, color: 'var(--info)' },
        { label: 'Selected', count: apps.filter(a => a.status === 'selected').length, color: 'var(--accent)' },
        { label: 'Rejected', count: apps.filter(a => a.status === 'rejected').length, color: 'var(--danger)' },
      ];
    });

    function findAppId(driveId) {
      const a = data.value.applications?.find(a => a.drive_id === driveId);
      return a?.id || '';
    }

    async function load() {
      loading.value = true;
      try { data.value = await api.get('/student/dashboard'); }
      catch (e) { showToast(e.message, 'error'); }
      finally { loading.value = false; }
    }

    async function apply(d) {
      applying.value = d.id;
      try {
        await api.post(`/student/apply/${d.id}`);
        showToast('Application submitted!');
        await load();
      } catch (e) { showToast(e.message, 'error'); }
      finally { applying.value = null; }
    }

    async function loadExports() {
      try { exports.value = await api.get('/student/exports'); }
      catch (e) { console.warn('Could not load exports:', e.message); }
    }

    async function exportCSV() {
      exporting.value = true;
      try {
        const res = await api.post('/student/export');
        showToast(res.message, 'info');
        // Poll until done then refresh export list
        if (res.task_log_id) {
          const poll = setInterval(async () => {
            try {
              const s = await api.get(`/student/export/status/${res.task_id}`);
              if (s.status === 'SUCCESS' || s.status === 'FAILURE') {
                clearInterval(poll);
                await loadExports();
                if (s.status === 'SUCCESS') showToast('Export ready — click Download!', 'success');
              }
            } catch { clearInterval(poll); }
          }, 3000);
        }
      } catch (e) {
        const msg = e.message || 'Export failed';
        showToast(msg, 'error');
      } finally {
        exporting.value = false;
      }
    }

    load();
    loadExports();
    return { data, loading, search, eligFilter, filteredDrives, appStats, applying, exporting, exports, apply, exportCSV, findAppId };
  },
};
