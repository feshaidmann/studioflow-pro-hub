export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_invocations: {
        Row: {
          cost_usd: number
          created_at: string
          function_name: string
          id: string
          model: string
          status: string
          tokens_input: number | null
          tokens_output: number | null
          user_id: string | null
        }
        Insert: {
          cost_usd?: number
          created_at?: string
          function_name?: string
          id?: string
          model?: string
          status?: string
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string | null
        }
        Update: {
          cost_usd?: number
          created_at?: string
          function_name?: string
          id?: string
          model?: string
          status?: string
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          suggestions: Json | null
          user_id: string
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          suggestions?: Json | null
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          suggestions?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_feedback: {
        Row: {
          category: string
          created_at: string
          id: string
          message: string
          page: string | null
          rating: number | null
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          message: string
          page?: string | null
          rating?: number | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          message?: string
          page?: string | null
          rating?: number | null
          user_id?: string
        }
        Relationships: []
      }
      editais: {
        Row: {
          abertura: string | null
          area: string | null
          created_at: string | null
          estado: string | null
          id: string
          inferido: boolean | null
          link: string | null
          orgao: string | null
          origem_url: string | null
          prazo: string | null
          project_id: string | null
          session_key: string | null
          status: string | null
          titulo: string
          user_id: string
        }
        Insert: {
          abertura?: string | null
          area?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          inferido?: boolean | null
          link?: string | null
          orgao?: string | null
          origem_url?: string | null
          prazo?: string | null
          project_id?: string | null
          session_key?: string | null
          status?: string | null
          titulo: string
          user_id: string
        }
        Update: {
          abertura?: string | null
          area?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          inferido?: boolean | null
          link?: string | null
          orgao?: string | null
          origem_url?: string | null
          prazo?: string | null
          project_id?: string | null
          session_key?: string | null
          status?: string | null
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "editais_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          all_day: boolean
          created_at: string
          description: string | null
          end_datetime: string | null
          event_type: string
          id: string
          location: string | null
          project_id: string | null
          start_datetime: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          description?: string | null
          end_datetime?: string | null
          event_type?: string
          id?: string
          location?: string | null
          project_id?: string | null
          start_datetime: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          all_day?: boolean
          created_at?: string
          description?: string | null
          end_datetime?: string | null
          event_type?: string
          id?: string
          location?: string | null
          project_id?: string | null
          start_datetime?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      fontes_editais: {
        Row: {
          ativo: boolean
          created_at: string
          frequencia_horas: number
          id: string
          nome: string
          parametros: Json
          tipo: string
          ultima_busca: string | null
          url_base: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          frequencia_horas?: number
          id?: string
          nome: string
          parametros?: Json
          tipo?: string
          ultima_busca?: string | null
          url_base?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          frequencia_horas?: number
          id?: string
          nome?: string
          parametros?: Json
          tipo?: string
          ultima_busca?: string | null
          url_base?: string
          user_id?: string
        }
        Relationships: []
      }
      function_logs: {
        Row: {
          created_at: string
          details: Json | null
          function_name: string
          id: string
          level: string
          message: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          function_name?: string
          id?: string
          level?: string
          message?: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          function_name?: string
          id?: string
          level?: string
          message?: string
        }
        Relationships: []
      }
      mix_tracks: {
        Row: {
          comp_gr_db: number
          created_at: string
          done: boolean
          eq_notes: string
          fee_paid: boolean
          gain_dbfs: number
          high_pass_hz: number
          id: string
          musician_fee: number
          musician_id: string
          name: string
          position: number
          project_id: string
          sidechain_trigger: string
          track_source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comp_gr_db?: number
          created_at?: string
          done?: boolean
          eq_notes?: string
          fee_paid?: boolean
          gain_dbfs?: number
          high_pass_hz?: number
          id: string
          musician_fee?: number
          musician_id?: string
          name?: string
          position?: number
          project_id: string
          sidechain_trigger?: string
          track_source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comp_gr_db?: number
          created_at?: string
          done?: boolean
          eq_notes?: string
          fee_paid?: boolean
          gain_dbfs?: number
          high_pass_hz?: number
          id?: string
          musician_fee?: number
          musician_id?: string
          name?: string
          position?: number
          project_id?: string
          sidechain_trigger?: string
          track_source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mix_tracks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      music_dna_analyses: {
        Row: {
          created_at: string
          diagnosis: Json
          genre: string
          id: string
          input_metadata: Json
          track_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          diagnosis?: Json
          genre?: string
          id?: string
          input_metadata?: Json
          track_name?: string
          user_id: string
        }
        Update: {
          created_at?: string
          diagnosis?: Json
          genre?: string
          id?: string
          input_metadata?: Json
          track_name?: string
          user_id?: string
        }
        Relationships: []
      }
      music_dna_feedback: {
        Row: {
          analysis_id: string
          corrected_features: Json
          corrected_genre: string
          created_at: string
          feedback_text: string
          id: string
          original_features: Json
          original_genre: string
          user_id: string
        }
        Insert: {
          analysis_id?: string
          corrected_features?: Json
          corrected_genre?: string
          created_at?: string
          feedback_text?: string
          id?: string
          original_features?: Json
          original_genre?: string
          user_id: string
        }
        Update: {
          analysis_id?: string
          corrected_features?: Json
          corrected_genre?: string
          created_at?: string
          feedback_text?: string
          id?: string
          original_features?: Json
          original_genre?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          duration_seconds: number
          id: string
          page_path: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          id?: string
          page_path?: string
          session_id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          id?: string
          page_path?: string
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_invitations: {
        Row: {
          allow_global_listing: boolean
          created_at: string
          expires_at: string
          id: string
          invited_by: string
          invitee_email: string
          invitee_name: string
          responded_at: string | null
          status: string
          token: string
        }
        Insert: {
          allow_global_listing?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          invited_by: string
          invitee_email: string
          invitee_name?: string
          responded_at?: string | null
          status?: string
          token?: string
        }
        Update: {
          allow_global_listing?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          invited_by?: string
          invitee_email?: string
          invitee_name?: string
          responded_at?: string | null
          status?: string
          token?: string
        }
        Relationships: []
      }
      professional_ratings: {
        Row: {
          created_at: string
          id: string
          notes: string
          professional_email: string
          professional_name: string
          project_id: string
          stars: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string
          professional_email?: string
          professional_name?: string
          project_id: string
          stars: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string
          professional_email?: string
          professional_name?: string
          project_id?: string
          stars?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_ratings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          active: boolean
          allow_global_listing: boolean
          bio: string
          created_at: string
          email: string
          favorite: boolean
          id: string
          name: string
          phone: string
          specialty: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          allow_global_listing?: boolean
          bio?: string
          created_at?: string
          email: string
          favorite?: boolean
          id?: string
          name: string
          phone?: string
          specialty?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          allow_global_listing?: boolean
          bio?: string
          created_at?: string
          email?: string
          favorite?: boolean
          id?: string
          name?: string
          phone?: string
          specialty?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accept_invites: boolean
          allow_global_listing: boolean
          avatar_url: string | null
          bio: string
          city: string
          created_at: string
          current_moment: string
          display_name: string
          id: string
          main_pain: string
          onboarding_completed: boolean
          onboarding_version: number
          origin: string
          plan: string
          projects_completed: number
          public_email: string
          specialties: string[]
          track_view_mode: string
          updated_at: string
          user_type: string
          username: string | null
          whatsapp: string
          work_links: Json
          youtube_url: string | null
        }
        Insert: {
          accept_invites?: boolean
          allow_global_listing?: boolean
          avatar_url?: string | null
          bio?: string
          city?: string
          created_at?: string
          current_moment?: string
          display_name?: string
          id: string
          main_pain?: string
          onboarding_completed?: boolean
          onboarding_version?: number
          origin?: string
          plan?: string
          projects_completed?: number
          public_email?: string
          specialties?: string[]
          track_view_mode?: string
          updated_at?: string
          user_type?: string
          username?: string | null
          whatsapp?: string
          work_links?: Json
          youtube_url?: string | null
        }
        Update: {
          accept_invites?: boolean
          allow_global_listing?: boolean
          avatar_url?: string | null
          bio?: string
          city?: string
          created_at?: string
          current_moment?: string
          display_name?: string
          id?: string
          main_pain?: string
          onboarding_completed?: boolean
          onboarding_version?: number
          origin?: string
          plan?: string
          projects_completed?: number
          public_email?: string
          specialties?: string[]
          track_view_mode?: string
          updated_at?: string
          user_type?: string
          username?: string | null
          whatsapp?: string
          work_links?: Json
          youtube_url?: string | null
        }
        Relationships: []
      }
      project_files: {
        Row: {
          comments: string
          created_at: string
          file_name: string
          folder: string
          id: string
          mime_type: string
          original_name: string
          parent_file_id: string | null
          project_id: string
          size: number
          status: string
          storage_path: string
          updated_at: string
          uploaded_by_name: string
          user_id: string
          version_number: number
        }
        Insert: {
          comments?: string
          created_at?: string
          file_name: string
          folder?: string
          id?: string
          mime_type?: string
          original_name: string
          parent_file_id?: string | null
          project_id: string
          size?: number
          status?: string
          storage_path: string
          updated_at?: string
          uploaded_by_name?: string
          user_id: string
          version_number?: number
        }
        Update: {
          comments?: string
          created_at?: string
          file_name?: string
          folder?: string
          id?: string
          mime_type?: string
          original_name?: string
          parent_file_id?: string | null
          project_id?: string
          size?: number
          status?: string
          storage_path?: string
          updated_at?: string
          uploaded_by_name?: string
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_files_parent_file_id_fkey"
            columns: ["parent_file_id"]
            isOneToOne: false
            referencedRelation: "project_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_invitations: {
        Row: {
          accepted_at: string | null
          allow_global_listing: boolean | null
          created_at: string
          deadline: string
          declined_at: string | null
          expires_at: string
          fee: number
          id: string
          invited_by: string
          professional_email: string
          professional_name: string
          professional_role: string
          project_id: string
          responded_at: string | null
          schedule_notes: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          allow_global_listing?: boolean | null
          created_at?: string
          deadline?: string
          declined_at?: string | null
          expires_at?: string
          fee?: number
          id?: string
          invited_by: string
          professional_email: string
          professional_name?: string
          professional_role?: string
          project_id: string
          responded_at?: string | null
          schedule_notes?: string
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          allow_global_listing?: boolean | null
          created_at?: string
          deadline?: string
          declined_at?: string | null
          expires_at?: string
          fee?: number
          id?: string
          invited_by?: string
          professional_email?: string
          professional_name?: string
          professional_role?: string
          project_id?: string
          responded_at?: string | null
          schedule_notes?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_invitations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string
          delivery_due_date: string | null
          delivery_status: string
          email: string
          expected_deliverable: string
          fee: number
          id: string
          instrument: string
          invitation_id: string | null
          last_activity_at: string | null
          member_type: string
          name: string
          notes: string
          permissions_scope: string
          phone: string
          project_id: string
          role: string
          stage: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_due_date?: string | null
          delivery_status?: string
          email?: string
          expected_deliverable?: string
          fee?: number
          id?: string
          instrument?: string
          invitation_id?: string | null
          last_activity_at?: string | null
          member_type?: string
          name?: string
          notes?: string
          permissions_scope?: string
          phone?: string
          project_id: string
          role?: string
          stage?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_due_date?: string | null
          delivery_status?: string
          email?: string
          expected_deliverable?: string
          fee?: number
          id?: string
          instrument?: string
          invitation_id?: string | null
          last_activity_at?: string | null
          member_type?: string
          name?: string
          notes?: string
          permissions_scope?: string
          phone?: string
          project_id?: string
          role?: string
          stage?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "project_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_messages: {
        Row: {
          attachment_name: string
          attachment_path: string
          content: string
          created_at: string
          id: string
          is_pending: boolean
          is_resolved: boolean
          linked_task_id: string | null
          project_id: string
          user_id: string
        }
        Insert: {
          attachment_name?: string
          attachment_path?: string
          content: string
          created_at?: string
          id?: string
          is_pending?: boolean
          is_resolved?: boolean
          linked_task_id?: string | null
          project_id: string
          user_id: string
        }
        Update: {
          attachment_name?: string
          attachment_path?: string
          content?: string
          created_at?: string
          id?: string
          is_pending?: boolean
          is_resolved?: boolean
          linked_task_id?: string | null
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          amount_paid: number | null
          artist: string
          bpm: number
          completed: boolean
          created_at: string
          estimated_months: number | null
          id: string
          key: string
          lufs: number
          master_done: boolean
          mix_percent: number
          name: string
          notes: string
          project_type: string
          revenue_estimate: number
          stage: string
          streaming_ready: boolean | null
          total_contract_value: number | null
          track_count: number | null
          updated_at: string
          upload_date: string
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          artist?: string
          bpm?: number
          completed?: boolean
          created_at?: string
          estimated_months?: number | null
          id?: string
          key?: string
          lufs?: number
          master_done?: boolean
          mix_percent?: number
          name: string
          notes?: string
          project_type?: string
          revenue_estimate?: number
          stage?: string
          streaming_ready?: boolean | null
          total_contract_value?: number | null
          track_count?: number | null
          updated_at?: string
          upload_date?: string
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          artist?: string
          bpm?: number
          completed?: boolean
          created_at?: string
          estimated_months?: number | null
          id?: string
          key?: string
          lufs?: number
          master_done?: boolean
          mix_percent?: number
          name?: string
          notes?: string
          project_type?: string
          revenue_estimate?: number
          stage?: string
          streaming_ready?: boolean | null
          total_contract_value?: number | null
          track_count?: number | null
          updated_at?: string
          upload_date?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      release_checklists: {
        Row: {
          created_at: string
          id: string
          items: Json
          metadata: Json
          project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          metadata?: Json
          project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          metadata?: Json
          project_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_checklists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      task_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          parameters: Json
          rule_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          parameters?: Json
          rule_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          parameters?: Json
          rule_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string
          auto_generated: boolean
          blocked: boolean
          blocked_reason: string
          completed: boolean
          created_at: string
          description: string
          dismissed: boolean
          due_date: string | null
          id: string
          project_id: string | null
          severity: string
          source: string
          source_key: string
          source_module: string
          task_area: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string
          auto_generated?: boolean
          blocked?: boolean
          blocked_reason?: string
          completed?: boolean
          created_at?: string
          description?: string
          dismissed?: boolean
          due_date?: string | null
          id?: string
          project_id?: string | null
          severity?: string
          source?: string
          source_key?: string
          source_module?: string
          task_area?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string
          auto_generated?: boolean
          blocked?: boolean
          blocked_reason?: string
          completed?: boolean
          created_at?: string
          description?: string
          dismissed?: boolean
          due_date?: string | null
          id?: string
          project_id?: string | null
          severity?: string
          source?: string
          source_key?: string
          source_module?: string
          task_area?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      template_tracks: {
        Row: {
          id: string
          name: string
          position: number
          template_id: string
        }
        Insert: {
          id?: string
          name?: string
          position?: number
          template_id: string
        }
        Update: {
          id?: string
          name?: string
          position?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_tracks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "track_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      track_templates: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          custom_category: string
          date: string
          description: string
          id: string
          notes: string
          paid: boolean
          project_id: string | null
          track_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          custom_category?: string
          date?: string
          description?: string
          id?: string
          notes?: string
          paid?: boolean
          project_id?: string | null
          track_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          custom_category?: string
          date?: string
          description?: string
          id?: string
          notes?: string
          paid?: boolean
          project_id?: string | null
          track_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_auth_email: { Args: never; Returns: string }
      get_file_download_url: { Args: { p_file_id: string }; Returns: string }
      get_member_projects: {
        Args: never
        Returns: {
          artist: string
          completed: boolean
          id: string
          name: string
          project_type: string
          role: string
          stage: string
        }[]
      }
      get_professional_project_count: {
        Args: { p_email: string; p_name: string }
        Returns: number
      }
      get_project_for_member: {
        Args: { p_project_id: string }
        Returns: {
          artist: string
          completed: boolean
          id: string
          name: string
          project_type: string
          stage: string
        }[]
      }
      get_public_profile: {
        Args: { p_username: string }
        Returns: {
          accept_invites: boolean
          allow_global_listing: boolean
          bio: string
          city: string
          created_at: string
          display_name: string
          id: string
          projects_completed: number
          public_email: string
          specialties: string[]
          username: string
          whatsapp: string
        }[]
      }
      get_public_profile_history: {
        Args: { p_email: string }
        Returns: {
          delivery_due_date: string
          delivery_status: string
          joined_at: string
          project_name: string
          role: string
        }[]
      }
      get_public_profile_ratings: {
        Args: { p_profile_id: string }
        Returns: {
          avg_stars: number
          rating_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
