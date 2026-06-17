import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationItem, SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.css']
})
export class NotificationsPage implements OnInit {
  loading = true;
  notifications: NotificationItem[] = [];

  constructor(private router: Router) {}

  async ngOnInit() {
    await this.loadNotifications();
  }

  async loadNotifications(event?: any) {
    this.loading = true;
    try {
      this.notifications = await SupabaseService.getNotifications();
    } catch (error) {
      console.error('Unable to load notifications', error);
      this.notifications = [];
    } finally {
      this.loading = false;
      if (event?.target?.complete) {
        event.target.complete();
      }
    }
  }

  async markAsRead(notification: NotificationItem) {
    if (notification.is_read) return;
    try {
      await SupabaseService.markNotificationRead(notification.id);
      notification.is_read = true;
    } catch (error) {
      console.error('Unable to mark notification read', error);
    }
  }

  async openNotification(notification: NotificationItem) {
    await this.markAsRead(notification);
    if (!notification.link) return;

    const path = notification.link.startsWith('/') ? notification.link : `/${notification.link}`;
    if (path.startsWith('/sauce/') || path.startsWith('/recipe/')) {
      this.router.navigateByUrl(path);
      return;
    }
    if (path.startsWith('/tabs/') || path.startsWith('/admin/')) {
      this.router.navigateByUrl(path);
    }
  }

  formatDate(createdAt: string) {
    const date = new Date(createdAt);
    return date.toLocaleString();
  }
}
