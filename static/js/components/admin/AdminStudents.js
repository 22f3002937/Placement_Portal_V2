const AdminStudents = {
  name: 'AdminStudents',
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
          <h1 class="page-title">Students</h1>
          <div class="page-sub">Manage student accounts</div>
        </div>

        <!-- Search -->
        <div class="search-wrap mb-4" style="max-width:380px;">
          <i class="bi bi-search"></i>
          <input v-model="search" class="ppa-input" placeholder="Filter by name or branch..."/>
        </div>

        <div v-if="loading" class="text-center py-5"><span class="ppa-spinner" style="width:2rem;height:2rem;"></span></div>

        <div v-else class="ppa-card-flat">
          <div class="table-responsive">
            <table class="ppa-table">
              <thead>
                <tr><th>Student</th><th>Branch</th><th>CGPA</th><th>Grad Year</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                <tr v-for="s in filtered" :key="s.id">
                  <td>
                    <div style="font-weight:600;">{{ s.name }}</div>
                    <div style="color:var(--text-muted);font-size:.8rem;">{{ s.email }}</div>
                  </td>
                  <td>{{ s.branch }}</td>
                  <td>{{ s.cgpa }}</td>
                  <td>{{ s.graduation_year }}</td>
                  <td>
                    <span v-if="!s.is_active" class="badge-ppa badge-rejected">Inactive</span>
                    <span v-else-if="s.is_blacklisted" class="badge-ppa badge-blacklisted">Blacklisted</span>
                    <span v-else class="badge-ppa badge-approved">Active</span>
                  </td>
                  <td>
                    <div class="d-flex gap-1 flex-wrap">
                      <button class="btn-ppa-outline btn-sm-ppa" @click="openEdit(s)">Edit</button>
                      <button class="btn-ppa-outline btn-sm-ppa" @click="toggleDeactivate(s)">
                        {{ s.is_active ? 'Deactivate' : 'Activate' }}
                      </button>
                      <button class="btn-ppa-danger btn-sm-ppa" @click="toggleBlacklist(s)">
                        {{ s.is_blacklisted ? 'Unblacklist' : 'Blacklist' }}
                      </button>
                      <button class="btn-ppa-danger btn-sm-ppa" @click="deleteStudent(s)">Delete</button>
                    </div>
                  </td>
                </tr>
                <tr v-if="!filtered.length">
                  <td colspan="6"><div class="empty-state"><i class="bi bi-people"></i><p>No students found</p></div></td>
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
                <span class="ppa-modal-title">Edit Student</span>
                <button class="btn-close-ppa" @click="editModal=null"><i class="bi bi-x-lg"></i></button>
              </div>
              <div class="row g-3">
                <div class="col-12">
                  <label class="ppa-label">Full Name</label>
                  <input v-model="editModal.name" class="ppa-input"/>
                </div>
                <div class="col-md-6">
                  <label class="ppa-label">Branch</label>
                  <input v-model="editModal.branch" class="ppa-input"/>
                </div>
                <div class="col-md-6">
                  <label class="ppa-label">CGPA</label>
                  <input v-model.number="editModal.cgpa" type="number" step="0.01" class="ppa-input"/>
                </div>
                <div class="col-12">
                  <label class="ppa-label">Graduation Year</label>
                  <input v-model.number="editModal.graduation_year" type="number" class="ppa-input"/>
                </div>
              </div>
              <div class="d-flex gap-2 mt-4 justify-content-end">
                <button class="btn-ppa-outline" @click="editModal=null">Cancel</button>
                <button class="btn-ppa" @click="saveEdit">Save</button>
              </div>
            </div>
          </div>
        </transition>
      </main>
    </div>
  `,
  setup() {
    const students = Vue.ref([]);
    const loading = Vue.ref(true);
    const search = Vue.ref('');
    const editModal = Vue.ref(null);

    const filtered = Vue.computed(() => {
      const q = search.value.toLowerCase();
      return students.value.filter(s =>
        s.name.toLowerCase().includes(q) || s.branch.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
      );
    });

    async function load() {
      loading.value = true;
      try { students.value = await api.get('/admin/students'); }
      catch (e) { showToast(e.message, 'error'); }
      finally { loading.value = false; }
    }

    async function toggleDeactivate(s) {
      try {
        const res = await api.patch(`/admin/students/${s.id}/deactivate`);
        showToast(res.message);
        await load();
      } catch (e) { showToast(e.message, 'error'); }
    }

    async function toggleBlacklist(s) {
      try {
        const res = await api.patch(`/admin/students/${s.id}/blacklist`);
        showToast(res.message);
        await load();
      } catch (e) { showToast(e.message, 'error'); }
    }

    async function deleteStudent(s) {
      if (!confirm(`Delete ${s.name}? This cannot be undone.`)) return;
      try {
        await api.delete(`/admin/students/${s.id}`);
        showToast('Student deleted');
        await load();
      } catch (e) { showToast(e.message, 'error'); }
    }

    function openEdit(s) {
      editModal.value = { id: s.id, name: s.name, branch: s.branch, cgpa: s.cgpa, graduation_year: s.graduation_year };
    }

    async function saveEdit() {
      try {
        await api.put(`/admin/students/${editModal.value.id}`, editModal.value);
        showToast('Student updated');
        editModal.value = null;
        await load();
      } catch (e) { showToast(e.message, 'error'); }
    }

    load();
    return { students, loading, search, filtered, editModal, toggleDeactivate, toggleBlacklist, deleteStudent, openEdit, saveEdit };
  },
};
