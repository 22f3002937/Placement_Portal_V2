const AdminDashboard = {
  name: 'AdminDashboard',
  template: `
    <div class="ppa-layout">
      <!-- Sidebar -->
      <aside class="ppa-sidebar">
        <div class="sidebar-section">Overview</div>
        <router-link to="/admin" class="sidebar-link" active-class="active" exact>
          <i class="bi bi-grid-1x2"></i> Dashboard
        </router-link>
        <div class="sidebar-section">Manage</div>
        <router-link to="/admin/companies" class="sidebar-link" active-class="active">
          <i class="bi bi-building"></i> Companies
        </router-link>
        <router-link to="/admin/students" class="sidebar-link" active-class="active">
          <i class="bi bi-people"></i> Students
        </router-link>
        <router-link to="/admin/drives" class="sidebar-link" active-class="active">
          <i class="bi bi-briefcase"></i> Drives
        </router-link>
      </aside>

      <main class="ppa-main">
        <div class="page-header">
          <h1 class="page-title">Dashboard</h1>
          <div class="page-sub">Placement portal overview</div>
        </div>

        <!-- Stats -->
        <div v-if="loading" class="text-center py-5">
          <span class="ppa-spinner" style="width:2rem;height:2rem;"></span>
        </div>
        <div v-else class="row g-3 mb-4">
          <div class="col-6 col-md-3">
            <div class="stat-card">
              <div class="stat-value">{{ stats.total_students }}</div>
              <div class="stat-label"><i class="bi bi-mortarboard me-1"></i>Students</div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="stat-card">
              <div class="stat-value">{{ stats.total_companies }}</div>
              <div class="stat-label"><i class="bi bi-building me-1"></i>Companies</div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="stat-card">
              <div class="stat-value">{{ stats.total_drives }}</div>
              <div class="stat-label"><i class="bi bi-briefcase me-1"></i>Drives</div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="stat-card">
              <div class="stat-value">{{ stats.total_applications }}</div>
              <div class="stat-label"><i class="bi bi-file-earmark-text me-1"></i>Applications</div>
            </div>
          </div>
        </div>

        <!-- Quick search -->
        <div class="ppa-card-flat">
          <h5 class="mb-3">Quick Search</h5>
          <div class="d-flex gap-2 mb-3">
            <div class="search-wrap flex-grow-1">
              <i class="bi bi-search"></i>
              <input v-model="query" class="ppa-input" placeholder="Search by name, email or ID..."
                @keyup.enter="search"/>
            </div>
            <button class="btn-ppa" @click="search">Search</button>
          </div>

          <div v-if="searched">
            <div v-if="results.students.length || results.companies.length">
              <div v-if="results.students.length" class="mb-3">
                <div style="color:var(--text-muted);font-size:.8rem;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.5rem;">Students</div>
                <table class="ppa-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Branch</th><th>CGPA</th></tr></thead>
                  <tbody>
                    <tr v-for="s in results.students" :key="s.id">
                      <td>{{ s.name }}</td>
                      <td style="color:var(--text-muted);">{{ s.email }}</td>
                      <td>{{ s.branch }}</td>
                      <td>{{ s.cgpa }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-if="results.companies.length">
                <div style="color:var(--text-muted);font-size:.8rem;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.5rem;">Companies</div>
                <table class="ppa-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Status</th></tr></thead>
                  <tbody>
                    <tr v-for="c in results.companies" :key="c.id">
                      <td>{{ c.name }}</td>
                      <td style="color:var(--text-muted);">{{ c.email }}</td>
                      <td><span class="badge-ppa" :class="'badge-'+c.status">{{ c.status }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div v-else class="empty-state">
              <i class="bi bi-search"></i>
              <p>No results found for "{{ query }}"</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  setup() {
    const stats = Vue.ref({});
    const loading = Vue.ref(true);
    const query = Vue.ref('');
    const results = Vue.ref({ students: [], companies: [] });
    const searched = Vue.ref(false);

    async function fetchStats() {
      loading.value = true;
      try { stats.value = await api.get('/admin/dashboard'); }
      catch (e) { showToast(e.message, 'error'); }
      finally { loading.value = false; }
    }

    async function search() {
      if (!query.value.trim()) return;
      try {
        results.value = await api.get(`/admin/search?q=${encodeURIComponent(query.value)}`);
        searched.value = true;
      } catch (e) { showToast(e.message, 'error'); }
    }

    fetchStats();
    return { stats, loading, query, results, searched, search };
  },
};
