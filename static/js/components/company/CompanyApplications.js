const CompanyApplications = {
  name: 'CompanyApplications',
  template: `
    <div class="ppa-layout">
      <aside class="ppa-sidebar">
        <div class="sidebar-section">Company</div>
        <router-link to="/company" class="sidebar-link" active-class="active" exact><i class="bi bi-grid-1x2"></i> Dashboard</router-link>
        <router-link to="/company/profile" class="sidebar-link" active-class="active"><i class="bi bi-building-gear"></i> Profile</router-link>
      </aside>

      <main class="ppa-main">
        <div class="d-flex align-items-center gap-2 mb-4">
          <router-link to="/company" style="color:var(--text-muted);text-decoration:none;font-size:.9rem;">
            <i class="bi bi-arrow-left me-1"></i>Back
          </router-link>
        </div>
        <div class="page-header">
          <h1 class="page-title">Applications</h1>
          <div class="page-sub" v-if="driveTitle">{{ driveTitle }}</div>
        </div>

        <!-- Status filter tabs -->
        <div class="ppa-tabs">
          <div v-for="f in filterOpts" :key="f" class="ppa-tab" :class="{active:statusFilter===f}" @click="statusFilter=f">
            {{ f === 'all' ? 'All' : f.charAt(0).toUpperCase()+f.slice(1) }}
            <span style="color:var(--text-muted);font-size:.78rem;"> ({{ countStatus(f) }})</span>
          </div>
        </div>

        <div v-if="loading" class="text-center py-5"><span class="ppa-spinner" style="width:2rem;height:2rem;"></span></div>

        <div v-else class="ppa-card-flat">
          <table class="ppa-table">
            <thead>
              <tr><th>Student</th><th>Branch / CGPA</th><th>Status</th><th>Applied On</th><th>Interview</th><th>Actions</th></tr>
            </thead>
            <tbody>
              <tr v-for="a in filtered" :key="a.id">
                <td>
                  <div style="font-weight:600;">{{ a.student_name }}</div>
                  <div style="color:var(--text-muted);font-size:.8rem;">{{ a.student_email }}</div>
                </td>
                <td>{{ a.branch }} / {{ a.cgpa }}</td>
                <td><span class="badge-ppa" :class="'badge-'+a.status">{{ a.status }}</span></td>
                <td style="color:var(--text-muted);font-size:.83rem;">{{ a.applied_on?.slice(0,10) }}</td>
                <td style="font-size:.83rem;">
                  <span v-if="a.interview_date">{{ a.interview_date }} {{ a.interview_time }}</span>
                  <span v-else style="color:var(--text-muted);">—</span>
                </td>
                <td>
                  <button class="btn-ppa-outline btn-sm-ppa" @click="openUpdate(a)">
                    <i class="bi bi-pencil me-1"></i>Update
                  </button>
                </td>
              </tr>
              <tr v-if="!filtered.length">
                <td colspan="6"><div class="empty-state"><i class="bi bi-inbox"></i><p>No applications</p></div></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Update Modal -->
        <transition name="fade">
          <div v-if="updateModal" class="ppa-modal-backdrop" @click.self="updateModal=null">
            <div class="ppa-modal">
              <div class="ppa-modal-header">
                <span class="ppa-modal-title">Update — {{ updateModal.student_name }}</span>
                <button class="btn-close-ppa" @click="updateModal=null"><i class="bi bi-x-lg"></i></button>
              </div>
              <div class="row g-3">
                <div class="col-12">
                  <label class="ppa-label">Status</label>
                  <select v-model="updateModal.status" class="ppa-select">
                    <option value="applied">Applied</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="selected">Selected</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="ppa-label">Interview Date</label>
                  <input v-model="updateModal.interview_date" type="date" class="ppa-input"/>
                </div>
                <div class="col-md-6">
                  <label class="ppa-label">Interview Time</label>
                  <input v-model="updateModal.interview_time" type="time" class="ppa-input"/>
                </div>
                <div class="col-12">
                  <label class="ppa-label">Interview Notes</label>
                  <textarea v-model="updateModal.interview_notes" class="ppa-textarea" placeholder="Optional notes..."></textarea>
                </div>
              </div>
              <div class="d-flex gap-2 mt-4 justify-content-end">
                <button class="btn-ppa-outline" @click="updateModal=null">Cancel</button>
                <button class="btn-ppa" @click="saveUpdate">Save</button>
              </div>
            </div>
          </div>
        </transition>
      </main>
    </div>
  `,
  setup() {
    const route = VueRouter.useRoute();
    const driveId = route.params.drive_id;
    const applications = Vue.ref([]);
    const driveTitle = Vue.ref('');
    const loading = Vue.ref(true);
    const statusFilter = Vue.ref('all');
    const updateModal = Vue.ref(null);
    const filterOpts = ['all', 'applied', 'shortlisted', 'selected', 'rejected'];

    const filtered = Vue.computed(() => {
      if (statusFilter.value === 'all') return applications.value;
      return applications.value.filter(a => a.status === statusFilter.value);
    });

    function countStatus(val) {
      if (val === 'all') return applications.value.length;
      return applications.value.filter(a => a.status === val).length;
    }

    async function load() {
      loading.value = true;
      try { applications.value = await api.get(`/company/drives/${driveId}/applications`); }
      catch (e) { showToast(e.message, 'error'); }
      finally { loading.value = false; }
    }

    function openUpdate(a) {
      updateModal.value = { ...a };
    }

    async function saveUpdate() {
      try {
        await api.patch(`/company/applications/${updateModal.value.id}`, {
          status: updateModal.value.status,
          interview_date: updateModal.value.interview_date || null,
          interview_time: updateModal.value.interview_time || null,
          interview_notes: updateModal.value.interview_notes || null,
        });
        showToast('Application updated');
        updateModal.value = null;
        await load();
      } catch (e) { showToast(e.message, 'error'); }
    }

    load();
    return { applications, driveTitle, loading, statusFilter, filterOpts, filtered, countStatus, updateModal, openUpdate, saveUpdate };
  },
};
