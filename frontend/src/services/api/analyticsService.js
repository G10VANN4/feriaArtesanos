// src/services/analyticsService.js
export const analyticsService = {
  trackLogin: (userData) => {
    if (window.gtag) {
      gtag('event', 'login', {
        user_id: userData.usuario_id,
        user_role: userData.rol_id === 2 ? 'admin' : 'artesano'
      });
    }
  },

  trackPageView: (pageName) => {
    if (window.gtag) {
      gtag('event', 'page_view', {
        page_title: pageName,
        page_location: window.location.href
      });
    }
  },

  trackAdminAction: (action, details) => {
    if (window.gtag) {
      gtag('event', 'admin_action', {
        action: action,
        ...details
      });
    }
  }
};