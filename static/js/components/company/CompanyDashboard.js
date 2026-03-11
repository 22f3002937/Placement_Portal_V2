const CompanyDashboard = {
  name: 'CompanyDashboard',
  template: `
    <div class="ppa-layout">
      <aside class="ppa-sidebar">
        <div class="sidebar-section">Company</div>
        <router-link to="/company" class="sidebar-link" active-class="active" exact><i class="bi bi-grid-1x2"></i> Dashboard</router-link>
        <router-link to="/company/profile" class="sidebar-link" active-class="active"><i class="bi bi-building-gear"></i> Profile</router-link>
      </aside>

      <main class="ppa-main">
        <div v-if="loading" class="text-center py-5"><span class="ppa-spinner" style="width:2rem;height:2rem;"></span></div>
        <div v-else>
          <div class="page-header d-flex justify-content-between align-items-start">
            <div>
              <h1 class="page-title">{{ data.company?.name }}</h1>
              <div class="page-sub">{{ data.company?.email }}</div>
            </div>
            <button class="btn-ppa" @click="showCreate=true">
              <i class="bi bi-plus-lg me-1"></i>New Drive
            </button>
          </div>

          <!-- Stats row -->
          <div class="row g-3 mb-4">
            <div class="col-6 col-md-3">
              <div class="stat-card">
                <div class="stat-value">{{ data.drives?.length }}</div>
                <div class="stat-label">Total Drives</div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="stat-card">
                <div class="stat-value">{{ pendingDrives }}</div>
                <div class="stat-label">Pending Approval</div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="stat-card">
                <div class="stat-value">{{ totalApplicants }}</div>
                <div class="stat-label">Total Applicants</div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="stat-card">
                <div class="stat-value">{{ activeDrives }}</div>
                <div class="stat-label">Active Drives</div>
              </div>
            </div>
          </div>

          <!-- Drives table -->
          <div class="ppa-card-flat">
            <h5 class="mb-3">Your Placement Drives</h5>
            <table class="ppa-table">
              <thead><tr><th>Job Title</th><th>Status</th><th>Deadline</th><th>Applicants</th><th>Actions</th></tr></thead>
              <tbody>
                <tr v-for="d in data.drives" :key="d.id">
                  <td style="font-weight:600;">{{ d.job_title }}</td>
                  <td><span class="badge-ppa" :class="'badge-'+d.status">{{ d.status }}</span></td>
                  <td style="color:var(--text-muted);font-size:.88rem;">{{ d.application_deadline }}</td>
                  <td>
                    <span style="font-weight:600;color:var(--accent);">{{ d.applicant_count }}</span>
                  </td>
                  <td>
                    <div class="d-flex gap-1">
                      <router-link :to="'/company/applications/'+d.id" class="btn-ppa-outline btn-sm-ppa">
                        <i class="bi bi-people me-1"></i>View
                      </router-link>
                      <button v-if="d.status==='approved'" class="btn-ppa-danger btn-sm-ppa" @click="closeDrive(d)">Close</button>
                    </div>
                  </td>
                </tr>
                <tr v-if="!data.drives?.length">
                  <td colspan="5"><div class="empty-state"><i class="bi bi-briefcase"></i><p>No drives yet. Create one!</p></div></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Create Drive Modal -->
        <transition name="fade">
          <div v-if="showCreate" class="ppa-modal-backdrop" @click.self="showCreate=false">
            <div class="ppa-modal">
              <div class="ppa-modal-header">
                <span class="ppa-modal-title">Create Placement Drive</span>
                <button class="btn-close-ppa" @click="showCreate=false"><i class="bi bi-x-lg"></i></button>
              </div>
              <div class="row g-3">
                <div class="col-12">
                  <label class="ppa-label">Job Title</label>
                  <input v-model="form.job_title" class="ppa-input" placeholder="e.g. Software Engineer"/>
                </div>
                <div class="col-12">
                  <label class="ppa-label">Job Description</label>
                  <textarea v-model="form.job_description" class="ppa-textarea" placeholder="Describe the role..."></textarea>
                </div>
                <div class="col-md-6">
                  <label class="ppa-label">Min CGPA</label>
                  <input v-model.number="form.min_cgpa" type="number" step="0.1" class="ppa-input" placeholder="7.0"/>
                </div>
                <div class="col-md-6">
                  <label class="ppa-label">Graduation Year</label>
                  <input v-model.number="form.eligible_year" type="number" class="ppa-input" placeholder="2025"/>
                </div>
                <div class="col-12">
                  <label class="ppa-label">Eligible Branches (comma-separated)</label>
                  <input v-model="form.eligible_branches_str" class="ppa-input" placeholder="CS, IT, ECE"/>
                </div>
                <div class="col-12">
                  <label class="ppa-label">Application Deadline</label>
                  <input v-model="form.application_deadline" type="date" class="ppa-input"/>
                </div>
              </div>
              <div class="d-flex gap-2 mt-4 justify-content-end">
                <button class="btn-ppa-outline" @click="showCreate=false">Cancel</button>
                <button class="btn-ppa" @click="createDrive" :disabled="creating">
                  <span v-if="creating"><span class="ppa-spinner" style="width:.9rem;height:.9rem;border-width:2px;vertical-align:middle;"></span></span>
                  <span v-else>Submit for Approval</span>
                </button>
              </div>
            </div>
          </div>
        </transition>
      </main>
    </div>
  `,
  setup() {
    const data = Vue.ref({ company: null, drives: [] });
    const loading = Vue.ref(true);
    const showCreate = Vue.ref(false);
    const creating = Vue.ref(false);
    const form = Vue.reactive({
      job_title: '', job_description: '', min_cgpa: null,
      eligible_year: null, eligible_branches_str: '', application_deadline: ''
    });

    const pendingDrives = Vue.computed(() => data.value.drives?.filter(d => d.status === 'pending').length || 0);
    const activeDrives  = Vue.computed(() => data.value.drives?.filter(d => d.status === 'approved').length || 0);
    const totalApplicants = Vue.computed(() => data.value.drives?.reduce((s, d) => s + d.applicant_count, 0) || 0);

    async function load() {
      loading.value = true;
      try { data.value = await api.get('/company/dashboard'); }
      catch (e) { showToast(e.message, 'error'); }
      finally { loading.value = false; }
    }

    async function createDrive() {
      creating.value = true;
      try {
        const branches = form.eligible_branches_str.split(',').map(b => b.trim()).filter(Boolean);
        await api.post('/company/drives', {
          job_title: form.job_title,
          job_description: form.job_description,
          min_cgpa: form.min_cgpa,
          eligible_year: form.eligible_year,
          eligible_branches: branches,
          application_deadline: form.application_deadline,
        });
        showToast('Drive created! Awaiting admin approval.');
        showCreate.value = false;
        Object.assign(form, { job_title:'', job_description:'', min_cgpa:null, eligible_year:null, eligible_branches_str:'', application_deadline:'' });
        await load();
      } catch (e) { showToast(e.message, 'error'); }
      finally { creating.value = false; }
    }

    async function closeDrive(d) {
      if (!confirm(`Close "${d.job_title}"?`)) return;
      try {
        await api.patch(`/company/drives/${d.id}/close`);
        showToast('Drive closed');
        await load();
      } catch (e) { showToast(e.message, 'error'); }
    }

    load();
    return { data, loading, showCreate, creating, form, pendingDrives, activeDrives, totalApplicants, createDrive, closeDrive };
  },
};
