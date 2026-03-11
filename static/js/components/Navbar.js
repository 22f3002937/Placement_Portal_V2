const NavbarComponent = {
  name: 'NavbarComponent',
  template: `
    <nav class="ppa-navbar d-flex align-items-center justify-content-between">
      <a class="ppa-brand" href="#" @click.prevent="goHome">PPA<span>.</span></a>
      <div class="d-flex align-items-center gap-3">
        <span style="color:var(--text-muted);font-size:.85rem;">
          <i class="bi bi-person-circle me-1"></i>{{ store.user?.name }}
          <span class="badge-ppa ms-2" :class="'badge-' + store.user?.role" style="font-size:.7rem;">
            {{ store.user?.role }}
          </span>
        </span>
        <button class="btn-nav-logout" @click="logout">
          <i class="bi bi-box-arrow-right me-1"></i>Logout
        </button>
      </div>
    </nav>
  `,
  setup() {
    const router = VueRouter.useRouter();

    function goHome() {
      if (!store.user) return;
      const map = { admin: '/admin', company: '/company', student: '/student' };
      router.push(map[store.user.role] || '/');
    }

    async function logout() {
      try {
        await api.post('/auth/logout');
      } catch (_) {}
      store.user = null;
      router.push('/login');
      showToast('Logged out', 'info');
    }

    return { store, logout, goHome };
  },
};
