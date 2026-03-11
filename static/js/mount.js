// ── Routes ───────────────────────────────────────────────────────────────────
const routes = [
  { path: '/',        redirect: '/login' },
  { path: '/login',   component: LoginPage },
  { path: '/register',component: RegisterPage },

  // Admin
  { path: '/admin',           component: AdminDashboard,  meta: { role: 'admin' } },
  { path: '/admin/companies', component: AdminCompanies,  meta: { role: 'admin' } },
  { path: '/admin/students',  component: AdminStudents,   meta: { role: 'admin' } },
  { path: '/admin/drives',    component: AdminDrives,     meta: { role: 'admin' } },

  // Company
  { path: '/company',                              component: CompanyDashboard,    meta: { role: 'company' } },
  { path: '/company/profile',                      component: CompanyProfile,      meta: { role: 'company' } },
  { path: '/company/applications/:drive_id',       component: CompanyApplications, meta: { role: 'company' } },

  // Student
  { path: '/student',                          component: StudentDashboard,  meta: { role: 'student' } },
  { path: '/student/history',                  component: StudentHistory,    meta: { role: 'student' } },
  { path: '/student/profile',                  component: StudentProfile,    meta: { role: 'student' } },
  { path: '/student/application/:id',          component: ApplicationDetail, meta: { role: 'student' } },
];

const router = VueRouter.createRouter({
  history: VueRouter.createWebHistory(),
  routes,
});

// ── Navigation guard ─────────────────────────────────────────────────────────
router.beforeEach(async (to, from, next) => {
  // Try to restore session on first load
  if (!store.user && to.meta.role) {
    try {
      const data = await api.get('/auth/me');
      store.user = data.user;
    } catch (_) {
      return next('/login');
    }
  }

  if (to.meta.role && store.user?.role !== to.meta.role) {
    const dest = { admin: '/admin', company: '/company', student: '/student' }[store.user?.role];
    return next(dest || '/login');
  }

  next();
});

// ── Mount ────────────────────────────────────────────────────────────────────
const app = Vue.createApp(App);
app.use(router);
app.component('navbar-component', NavbarComponent);
app.mount('#app');
