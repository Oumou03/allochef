import { Component, OnInit } from '@angular/core';
import { addIcons } from 'ionicons';
import {
  homeOutline,
  searchOutline,
  flameOutline,
  heartOutline,
  personOutline
} from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.css'],
  standalone: false
})
export class TabsPage implements OnInit {
  isChef = false;
  isAdmin = false;

  constructor() {
    addIcons({
      homeOutline,
      searchOutline,
      flameOutline,
      heartOutline,
      personOutline
    });
  }

  ngOnInit() {
    this.loadRole();
  }

  async loadRole() {
    try {
      const session = await SupabaseService.getSession();
      if (!session?.user?.id) {
        this.isChef = false;
        this.isAdmin = false;
        return;
      }

      const profile = await SupabaseService.getUserProfile(session.user.id);
      const role = profile ? SupabaseService.resolveRole(profile) : 'user';
      this.isChef = role === 'chef';
      this.isAdmin = role === 'admin';
    } catch {
      this.isChef = false;
      this.isAdmin = false;
    }
  }
}
