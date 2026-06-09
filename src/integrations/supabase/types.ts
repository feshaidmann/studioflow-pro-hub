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
      alertas_editais: {
        Row: {
          created_at: string
          edital_id: string
          id: string
          lida: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          edital_id: string
          id?: string
          lida?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          edital_id?: string
          id?: string
          lida?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_editais_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "editais"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          project_id: string | null
          properties: Json
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          project_id?: string | null
          properties?: Json
          session_id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          project_id?: string | null
          properties?: Json
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
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
      creative_assets: {
        Row: {
          created_at: string
          format: string
          height: number
          id: string
          media_type: string
          project_id: string | null
          prompt: string
          public_url: string | null
          storage_path: string
          style: string | null
          user_id: string
          width: number
        }
        Insert: {
          created_at?: string
          format: string
          height: number
          id?: string
          media_type?: string
          project_id?: string | null
          prompt: string
          public_url?: string | null
          storage_path: string
          style?: string | null
          user_id: string
          width: number
        }
        Update: {
          created_at?: string
          format?: string
          height?: number
          id?: string
          media_type?: string
          project_id?: string | null
          prompt?: string
          public_url?: string | null
          storage_path?: string
          style?: string | null
          user_id?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "creative_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_captions: {
        Row: {
          artist_name: string
          campaign_phase: string
          caption: string
          created_at: string
          dna_context: string
          hashtags_mode: string
          id: string
          length: string
          objective: string
          platform: string
          project_id: string | null
          prompt: string
          tone: string
          track_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          artist_name?: string
          campaign_phase?: string
          caption: string
          created_at?: string
          dna_context?: string
          hashtags_mode?: string
          id?: string
          length?: string
          objective?: string
          platform?: string
          project_id?: string | null
          prompt?: string
          tone?: string
          track_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          artist_name?: string
          campaign_phase?: string
          caption?: string
          created_at?: string
          dna_context?: string
          hashtags_mode?: string
          id?: string
          length?: string
          objective?: string
          platform?: string
          project_id?: string | null
          prompt?: string
          tone?: string
          track_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      diagnosis_acceptance_signals: {
        Row: {
          analysis_id: string
          created_at: string
          id: string
          signal_type: string
          summary_variant: string
          user_id: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          id?: string
          signal_type: string
          summary_variant: string
          user_id: string
        }
        Update: {
          analysis_id?: string
          created_at?: string
          id?: string
          signal_type?: string
          summary_variant?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnosis_acceptance_signals_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "music_dna_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      editais: {
        Row: {
          abertura: string | null
          area: string | null
          created_at: string | null
          documentos_resumo: string
          estado: string | null
          generos: string[]
          id: string
          inferido: boolean | null
          inscrito: boolean
          link: string | null
          link_checked_at: string | null
          link_status: string
          match_reason: string
          orgao: string | null
          origem_url: string | null
          periodo_inscricao: string | null
          porte: string | null
          prazo: string | null
          project_id: string | null
          publico_alvo: string
          resumo: string
          session_key: string | null
          status: string | null
          tem_edital: boolean | null
          tipo: string
          tipo_palco: string | null
          titulo: string
          user_id: string
          valor: string
        }
        Insert: {
          abertura?: string | null
          area?: string | null
          created_at?: string | null
          documentos_resumo?: string
          estado?: string | null
          generos?: string[]
          id?: string
          inferido?: boolean | null
          inscrito?: boolean
          link?: string | null
          link_checked_at?: string | null
          link_status?: string
          match_reason?: string
          orgao?: string | null
          origem_url?: string | null
          periodo_inscricao?: string | null
          porte?: string | null
          prazo?: string | null
          project_id?: string | null
          publico_alvo?: string
          resumo?: string
          session_key?: string | null
          status?: string | null
          tem_edital?: boolean | null
          tipo?: string
          tipo_palco?: string | null
          titulo: string
          user_id: string
          valor?: string
        }
        Update: {
          abertura?: string | null
          area?: string | null
          created_at?: string | null
          documentos_resumo?: string
          estado?: string | null
          generos?: string[]
          id?: string
          inferido?: boolean | null
          inscrito?: boolean
          link?: string | null
          link_checked_at?: string | null
          link_status?: string
          match_reason?: string
          orgao?: string | null
          origem_url?: string | null
          periodo_inscricao?: string | null
          porte?: string | null
          prazo?: string | null
          project_id?: string | null
          publico_alvo?: string
          resumo?: string
          session_key?: string | null
          status?: string | null
          tem_edital?: boolean | null
          tipo?: string
          tipo_palco?: string | null
          titulo?: string
          user_id?: string
          valor?: string
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
      edital_analyses_corpus: {
        Row: {
          content_hash: string
          created_at: string
          documentos: Json | null
          duration_ms: number | null
          edital_id: string | null
          edital_title: string | null
          id: string
          input_excerpt: string | null
          input_text: string | null
          model: string | null
          prazos: Json | null
          publico_alvo: string | null
          resumo: string | null
          source: string
          user_id: string | null
          valor: string | null
        }
        Insert: {
          content_hash: string
          created_at?: string
          documentos?: Json | null
          duration_ms?: number | null
          edital_id?: string | null
          edital_title?: string | null
          id?: string
          input_excerpt?: string | null
          input_text?: string | null
          model?: string | null
          prazos?: Json | null
          publico_alvo?: string | null
          resumo?: string | null
          source: string
          user_id?: string | null
          valor?: string | null
        }
        Update: {
          content_hash?: string
          created_at?: string
          documentos?: Json | null
          duration_ms?: number | null
          edital_id?: string | null
          edital_title?: string | null
          id?: string
          input_excerpt?: string | null
          input_text?: string | null
          model?: string | null
          prazos?: Json | null
          publico_alvo?: string | null
          resumo?: string | null
          source?: string
          user_id?: string | null
          valor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "edital_analyses_corpus_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "editais"
            referencedColumns: ["id"]
          },
        ]
      }
      edital_application_docs: {
        Row: {
          application_id: string
          completed_at: string | null
          created_at: string
          custom_content: string | null
          doc_label: string
          doc_type: string | null
          edital_document_id: string | null
          id: string
          is_completed: boolean
          is_required: boolean
          notes: string | null
          user_id: string
        }
        Insert: {
          application_id: string
          completed_at?: string | null
          created_at?: string
          custom_content?: string | null
          doc_label: string
          doc_type?: string | null
          edital_document_id?: string | null
          id?: string
          is_completed?: boolean
          is_required?: boolean
          notes?: string | null
          user_id: string
        }
        Update: {
          application_id?: string
          completed_at?: string | null
          created_at?: string
          custom_content?: string | null
          doc_label?: string
          doc_type?: string | null
          edital_document_id?: string | null
          id?: string
          is_completed?: boolean
          is_required?: boolean
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "edital_application_docs_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "edital_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edital_application_docs_edital_document_id_fkey"
            columns: ["edital_document_id"]
            isOneToOne: false
            referencedRelation: "edital_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      edital_applications: {
        Row: {
          analise_ia: Json | null
          contact_channel: string
          contact_recipient: string
          contacted_at: string | null
          created_at: string
          data_inscricao: string | null
          data_resultado: string | null
          epk_content: string
          id: string
          licoes_aprendidas: string | null
          motivo_recusa: string | null
          notas: string
          opportunity_id: string
          pitch_content: string
          pitch_subject: string
          project_id: string | null
          resultado: string | null
          status: string
          tipo: string
          updated_at: string
          user_id: string
          valor_aprovado: number | null
        }
        Insert: {
          analise_ia?: Json | null
          contact_channel?: string
          contact_recipient?: string
          contacted_at?: string | null
          created_at?: string
          data_inscricao?: string | null
          data_resultado?: string | null
          epk_content?: string
          id?: string
          licoes_aprendidas?: string | null
          motivo_recusa?: string | null
          notas?: string
          opportunity_id: string
          pitch_content?: string
          pitch_subject?: string
          project_id?: string | null
          resultado?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          user_id: string
          valor_aprovado?: number | null
        }
        Update: {
          analise_ia?: Json | null
          contact_channel?: string
          contact_recipient?: string
          contacted_at?: string | null
          created_at?: string
          data_inscricao?: string | null
          data_resultado?: string | null
          epk_content?: string
          id?: string
          licoes_aprendidas?: string | null
          motivo_recusa?: string | null
          notas?: string
          opportunity_id?: string
          pitch_content?: string
          pitch_subject?: string
          project_id?: string | null
          resultado?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          user_id?: string
          valor_aprovado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "edital_applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      edital_documents: {
        Row: {
          content: string
          created_at: string
          doc_type: string
          id: string
          last_used_at: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          doc_type?: string
          id?: string
          last_used_at?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          doc_type?: string
          id?: string
          last_used_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      genre_mismatch_feedback: {
        Row: {
          analysis_id: string | null
          created_at: string
          declared_genre: string
          detected_genre: string
          gap: number
          id: string
          score: number
          user_id: string
          verdict: string
        }
        Insert: {
          analysis_id?: string | null
          created_at?: string
          declared_genre?: string
          detected_genre?: string
          gap?: number
          id?: string
          score?: number
          user_id: string
          verdict: string
        }
        Update: {
          analysis_id?: string | null
          created_at?: string
          declared_genre?: string
          detected_genre?: string
          gap?: number
          id?: string
          score?: number
          user_id?: string
          verdict?: string
        }
        Relationships: []
      }
      marketplace_curated_providers: {
        Row: {
          avatar_url: string
          bio: string
          city: string
          contact_email: string
          contact_phone: string
          created_at: string
          curated_by: string | null
          genres: string[]
          id: string
          name: string
          notes: string
          portfolio_url: string
          specialty: string
          state: string
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string
          bio?: string
          city?: string
          contact_email?: string
          contact_phone?: string
          created_at?: string
          curated_by?: string | null
          genres?: string[]
          id?: string
          name: string
          notes?: string
          portfolio_url?: string
          specialty?: string
          state?: string
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string
          bio?: string
          city?: string
          contact_email?: string
          contact_phone?: string
          created_at?: string
          curated_by?: string | null
          genres?: string[]
          id?: string
          name?: string
          notes?: string
          portfolio_url?: string
          specialty?: string
          state?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_hint_dismissals: {
        Row: {
          created_at: string
          id: string
          project_id: string
          snooze_until: string | null
          specialty: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          snooze_until?: string | null
          specialty: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          snooze_until?: string | null
          specialty?: string
          updated_at?: string
          user_id?: string
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
          professional_id: string | null
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
          professional_id?: string | null
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
          professional_id?: string | null
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
          acousticness: number | null
          analysis_confidence: string | null
          created_at: string
          danceability: number | null
          deezer_id: number | null
          diagnosis: Json
          duration_ms: number | null
          dynamic_range_db: number | null
          energy: number | null
          fonte_analise: string | null
          full_analysis_at: string | null
          full_analysis_jsonb: Json | null
          genre: string
          id: string
          input_metadata: Json
          instrumentalness: number | null
          isrc: string | null
          key_name: string | null
          key_number: number | null
          legacy: boolean
          liveness: number | null
          loudness_db: number | null
          lufs_integrated: number | null
          mbid: string | null
          mode_name: string | null
          mode_number: number | null
          project_id: string | null
          speechiness: number | null
          spotify_id: string | null
          spotify_track_id: string | null
          stage: string | null
          summary_variant: string
          summary_variant_assigned_at: string | null
          tempo_bpm: number | null
          time_signature: number | null
          track_name: string
          track_version_id: string | null
          user_id: string
          valence: number | null
          version_label: string
          version_number: number
        }
        Insert: {
          acousticness?: number | null
          analysis_confidence?: string | null
          created_at?: string
          danceability?: number | null
          deezer_id?: number | null
          diagnosis?: Json
          duration_ms?: number | null
          dynamic_range_db?: number | null
          energy?: number | null
          fonte_analise?: string | null
          full_analysis_at?: string | null
          full_analysis_jsonb?: Json | null
          genre?: string
          id?: string
          input_metadata?: Json
          instrumentalness?: number | null
          isrc?: string | null
          key_name?: string | null
          key_number?: number | null
          legacy?: boolean
          liveness?: number | null
          loudness_db?: number | null
          lufs_integrated?: number | null
          mbid?: string | null
          mode_name?: string | null
          mode_number?: number | null
          project_id?: string | null
          speechiness?: number | null
          spotify_id?: string | null
          spotify_track_id?: string | null
          stage?: string | null
          summary_variant?: string
          summary_variant_assigned_at?: string | null
          tempo_bpm?: number | null
          time_signature?: number | null
          track_name?: string
          track_version_id?: string | null
          user_id: string
          valence?: number | null
          version_label?: string
          version_number?: number
        }
        Update: {
          acousticness?: number | null
          analysis_confidence?: string | null
          created_at?: string
          danceability?: number | null
          deezer_id?: number | null
          diagnosis?: Json
          duration_ms?: number | null
          dynamic_range_db?: number | null
          energy?: number | null
          fonte_analise?: string | null
          full_analysis_at?: string | null
          full_analysis_jsonb?: Json | null
          genre?: string
          id?: string
          input_metadata?: Json
          instrumentalness?: number | null
          isrc?: string | null
          key_name?: string | null
          key_number?: number | null
          legacy?: boolean
          liveness?: number | null
          loudness_db?: number | null
          lufs_integrated?: number | null
          mbid?: string | null
          mode_name?: string | null
          mode_number?: number | null
          project_id?: string | null
          speechiness?: number | null
          spotify_id?: string | null
          spotify_track_id?: string | null
          stage?: string | null
          summary_variant?: string
          summary_variant_assigned_at?: string | null
          tempo_bpm?: number | null
          time_signature?: number | null
          track_name?: string
          track_version_id?: string | null
          user_id?: string
          valence?: number | null
          version_label?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "music_dna_analyses_spotify_track_id_fkey"
            columns: ["spotify_track_id"]
            isOneToOne: false
            referencedRelation: "spotify_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_dna_analyses_track_version_id_fkey"
            columns: ["track_version_id"]
            isOneToOne: false
            referencedRelation: "music_track_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      music_dna_benchmarks_legacy_backup: {
        Row: {
          atualizado_em: string | null
          avg_acousticness: number | null
          avg_danceability: number | null
          avg_dynamic_range_db: number | null
          avg_energy: number | null
          avg_instrumentalness: number | null
          avg_liveness: number | null
          avg_loudness_db: number | null
          avg_lufs: number | null
          avg_spectral_centroid: number | null
          avg_spectral_flatness: number | null
          avg_speechiness: number | null
          avg_tempo_bpm: number | null
          avg_valence: number | null
          avg_zero_crossing_rate: number | null
          genero: string | null
          id: string | null
          top_keys: Json | null
          total_faixas: number | null
        }
        Insert: {
          atualizado_em?: string | null
          avg_acousticness?: number | null
          avg_danceability?: number | null
          avg_dynamic_range_db?: number | null
          avg_energy?: number | null
          avg_instrumentalness?: number | null
          avg_liveness?: number | null
          avg_loudness_db?: number | null
          avg_lufs?: number | null
          avg_spectral_centroid?: number | null
          avg_spectral_flatness?: number | null
          avg_speechiness?: number | null
          avg_tempo_bpm?: number | null
          avg_valence?: number | null
          avg_zero_crossing_rate?: number | null
          genero?: string | null
          id?: string | null
          top_keys?: Json | null
          total_faixas?: number | null
        }
        Update: {
          atualizado_em?: string | null
          avg_acousticness?: number | null
          avg_danceability?: number | null
          avg_dynamic_range_db?: number | null
          avg_energy?: number | null
          avg_instrumentalness?: number | null
          avg_liveness?: number | null
          avg_loudness_db?: number | null
          avg_lufs?: number | null
          avg_spectral_centroid?: number | null
          avg_spectral_flatness?: number | null
          avg_speechiness?: number | null
          avg_tempo_bpm?: number | null
          avg_valence?: number | null
          avg_zero_crossing_rate?: number | null
          genero?: string | null
          id?: string | null
          top_keys?: Json | null
          total_faixas?: number | null
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
      music_external_metadata: {
        Row: {
          artist_key: string
          deezer_cover_url: string | null
          deezer_id: number | null
          deezer_preview_url: string | null
          fetched_at: string
          id: string
          listenbrainz_similar: Json
          mbid: string | null
          musicbrainz_tags: Json
          raw: Json
          track_key: string
        }
        Insert: {
          artist_key: string
          deezer_cover_url?: string | null
          deezer_id?: number | null
          deezer_preview_url?: string | null
          fetched_at?: string
          id?: string
          listenbrainz_similar?: Json
          mbid?: string | null
          musicbrainz_tags?: Json
          raw?: Json
          track_key: string
        }
        Update: {
          artist_key?: string
          deezer_cover_url?: string | null
          deezer_id?: number | null
          deezer_preview_url?: string | null
          fetched_at?: string
          id?: string
          listenbrainz_similar?: Json
          mbid?: string | null
          musicbrainz_tags?: Json
          raw?: Json
          track_key?: string
        }
        Relationships: []
      }
      music_reference_tracks: {
        Row: {
          acousticness: number | null
          analysis_date: string | null
          band: string
          beat_times: Json | null
          chroma_cens: number[] | null
          created_at: string
          danceability: number | null
          duration_sec: number | null
          dynamic_range_db: number | null
          energy: number | null
          filename: string
          genre: string
          id: string
          instrumentalness: number | null
          key_index: number | null
          key_name: string | null
          liveness: number | null
          loudness_rms_db: number | null
          lufs_integrated: number | null
          lufs_method: string | null
          mfcc: number[] | null
          mode: string | null
          quarantine_reason: string | null
          quarantined: boolean
          segments_count: number | null
          source_batch: string
          spectral_bandwidth: number | null
          spectral_centroid: number | null
          spectral_contrast: number[] | null
          spectral_flatness: number | null
          spectral_rolloff: number | null
          speechiness: number | null
          tempo_bpm: number | null
          tempo_confidence: number | null
          updated_at: string
          valence: number | null
          zero_crossing_rate: number | null
        }
        Insert: {
          acousticness?: number | null
          analysis_date?: string | null
          band: string
          beat_times?: Json | null
          chroma_cens?: number[] | null
          created_at?: string
          danceability?: number | null
          duration_sec?: number | null
          dynamic_range_db?: number | null
          energy?: number | null
          filename: string
          genre?: string
          id?: string
          instrumentalness?: number | null
          key_index?: number | null
          key_name?: string | null
          liveness?: number | null
          loudness_rms_db?: number | null
          lufs_integrated?: number | null
          lufs_method?: string | null
          mfcc?: number[] | null
          mode?: string | null
          quarantine_reason?: string | null
          quarantined?: boolean
          segments_count?: number | null
          source_batch?: string
          spectral_bandwidth?: number | null
          spectral_centroid?: number | null
          spectral_contrast?: number[] | null
          spectral_flatness?: number | null
          spectral_rolloff?: number | null
          speechiness?: number | null
          tempo_bpm?: number | null
          tempo_confidence?: number | null
          updated_at?: string
          valence?: number | null
          zero_crossing_rate?: number | null
        }
        Update: {
          acousticness?: number | null
          analysis_date?: string | null
          band?: string
          beat_times?: Json | null
          chroma_cens?: number[] | null
          created_at?: string
          danceability?: number | null
          duration_sec?: number | null
          dynamic_range_db?: number | null
          energy?: number | null
          filename?: string
          genre?: string
          id?: string
          instrumentalness?: number | null
          key_index?: number | null
          key_name?: string | null
          liveness?: number | null
          loudness_rms_db?: number | null
          lufs_integrated?: number | null
          lufs_method?: string | null
          mfcc?: number[] | null
          mode?: string | null
          quarantine_reason?: string | null
          quarantined?: boolean
          segments_count?: number | null
          source_batch?: string
          spectral_bandwidth?: number | null
          spectral_centroid?: number | null
          spectral_contrast?: number[] | null
          spectral_flatness?: number | null
          spectral_rolloff?: number | null
          speechiness?: number | null
          tempo_bpm?: number | null
          tempo_confidence?: number | null
          updated_at?: string
          valence?: number | null
          zero_crossing_rate?: number | null
        }
        Relationships: []
      }
      music_reference_tracks_genre_backup: {
        Row: {
          backed_up_at: string
          band: string
          filename: string
          genre_prev: string | null
          track_id: string
        }
        Insert: {
          backed_up_at?: string
          band: string
          filename: string
          genre_prev?: string | null
          track_id: string
        }
        Update: {
          backed_up_at?: string
          band?: string
          filename?: string
          genre_prev?: string | null
          track_id?: string
        }
        Relationships: []
      }
      music_track_versions: {
        Row: {
          created_at: string
          display_name: string
          id: string
          project_id: string | null
          track_slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id?: string
          project_id?: string | null
          track_slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          project_id?: string | null
          track_slug?: string
          updated_at?: string
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
      palco_outreach_log: {
        Row: {
          application_id: string
          channel: string
          created_at: string
          direction: string
          id: string
          summary: string
          user_id: string
        }
        Insert: {
          application_id: string
          channel?: string
          created_at?: string
          direction?: string
          id?: string
          summary?: string
          user_id: string
        }
        Update: {
          application_id?: string
          channel?: string
          created_at?: string
          direction?: string
          id?: string
          summary?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "palco_outreach_log_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "edital_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      palco_proposals: {
        Row: {
          application_id: string
          cache_bruto: number
          condicoes: Json
          created_at: string
          forma_pagamento: string
          id: string
          proposta_md: string
          status: string
          updated_at: string
          user_id: string
          validade_dias: number
        }
        Insert: {
          application_id: string
          cache_bruto?: number
          condicoes?: Json
          created_at?: string
          forma_pagamento?: string
          id?: string
          proposta_md?: string
          status?: string
          updated_at?: string
          user_id: string
          validade_dias?: number
        }
        Update: {
          application_id?: string
          cache_bruto?: number
          condicoes?: Json
          created_at?: string
          forma_pagamento?: string
          id?: string
          proposta_md?: string
          status?: string
          updated_at?: string
          user_id?: string
          validade_dias?: number
        }
        Relationships: []
      }
      palco_tech_packages: {
        Row: {
          application_id: string
          created_at: string
          id: string
          orcamento: Json
          rider: Json
          stage_map: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          orcamento?: Json
          rider?: Json
          stage_map?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          orcamento?: Json
          rider?: Json
          stage_map?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      palcos_curados: {
        Row: {
          ativo: boolean | null
          cachet_medio: string | null
          created_at: string | null
          estado: string | null
          generos: string[] | null
          id: string
          link: string | null
          link_checked_at: string | null
          link_status: string
          match_reason: string
          nome: string
          organizador: string
          periodo_inscricao: string | null
          porte: string | null
          prazo: string | null
          publico_estimado: string | null
          resumo: string | null
          status: string | null
          tem_edital: boolean | null
          tipo_palco: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cachet_medio?: string | null
          created_at?: string | null
          estado?: string | null
          generos?: string[] | null
          id?: string
          link?: string | null
          link_checked_at?: string | null
          link_status?: string
          match_reason?: string
          nome: string
          organizador: string
          periodo_inscricao?: string | null
          porte?: string | null
          prazo?: string | null
          publico_estimado?: string | null
          resumo?: string | null
          status?: string | null
          tem_edital?: boolean | null
          tipo_palco: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cachet_medio?: string | null
          created_at?: string | null
          estado?: string | null
          generos?: string[] | null
          id?: string
          link?: string | null
          link_checked_at?: string | null
          link_status?: string
          match_reason?: string
          nome?: string
          organizador?: string
          periodo_inscricao?: string | null
          porte?: string | null
          prazo?: string | null
          publico_estimado?: string | null
          resumo?: string | null
          status?: string | null
          tem_edital?: boolean | null
          tipo_palco?: string
          updated_at?: string | null
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
      playlist_monitors: {
        Row: {
          created_at: string
          found_at: string | null
          id: string
          last_checked_at: string | null
          playlist_external_url: string | null
          playlist_id: string
          playlist_image_url: string | null
          playlist_name: string
          playlist_owner_name: string | null
          status: string
          track_name: string
          track_spotify_uri: string
          user_id: string
        }
        Insert: {
          created_at?: string
          found_at?: string | null
          id?: string
          last_checked_at?: string | null
          playlist_external_url?: string | null
          playlist_id: string
          playlist_image_url?: string | null
          playlist_name: string
          playlist_owner_name?: string | null
          status?: string
          track_name: string
          track_spotify_uri: string
          user_id: string
        }
        Update: {
          created_at?: string
          found_at?: string | null
          id?: string
          last_checked_at?: string | null
          playlist_external_url?: string | null
          playlist_id?: string
          playlist_image_url?: string | null
          playlist_name?: string
          playlist_owner_name?: string | null
          status?: string
          track_name?: string
          track_spotify_uri?: string
          user_id?: string
        }
        Relationships: []
      }
      playlist_profiles: {
        Row: {
          created_at: string
          description: string
          feature_ranges: Json
          id: string
          name: string
          sample_tracks: Json
          size: number
          slug: string
          updated_at: string
          vector: Json
        }
        Insert: {
          created_at?: string
          description?: string
          feature_ranges?: Json
          id?: string
          name: string
          sample_tracks?: Json
          size?: number
          slug: string
          updated_at?: string
          vector?: Json
        }
        Update: {
          created_at?: string
          description?: string
          feature_ranges?: Json
          id?: string
          name?: string
          sample_tracks?: Json
          size?: number
          slug?: string
          updated_at?: string
          vector?: Json
        }
        Relationships: []
      }
      professional_ratings: {
        Row: {
          created_at: string
          id: string
          notes: string
          professional_email: string
          professional_id: string | null
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
          professional_id?: string | null
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
          professional_id?: string | null
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
          captador_generos: string[]
          captador_palco_tipos: string[]
          captador_porte: string[]
          captador_regioes: string[]
          captador_taxa: string
          captador_verificado: boolean
          career_start_year: number | null
          city: string
          created_at: string
          current_moment: string
          display_name: string
          full_name: string
          id: string
          is_captador: boolean
          last_onboarding_project_id: string | null
          main_pain: string
          onboarding_completed: boolean
          onboarding_version: number
          origin: string
          plan: string
          primary_genre: string | null
          projects_completed: number
          public_email: string
          public_profile_enabled: boolean
          show_public_email: boolean
          show_public_whatsapp: boolean
          specialties: string[]
          state: string | null
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
          captador_generos?: string[]
          captador_palco_tipos?: string[]
          captador_porte?: string[]
          captador_regioes?: string[]
          captador_taxa?: string
          captador_verificado?: boolean
          career_start_year?: number | null
          city?: string
          created_at?: string
          current_moment?: string
          display_name?: string
          full_name?: string
          id: string
          is_captador?: boolean
          last_onboarding_project_id?: string | null
          main_pain?: string
          onboarding_completed?: boolean
          onboarding_version?: number
          origin?: string
          plan?: string
          primary_genre?: string | null
          projects_completed?: number
          public_email?: string
          public_profile_enabled?: boolean
          show_public_email?: boolean
          show_public_whatsapp?: boolean
          specialties?: string[]
          state?: string | null
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
          captador_generos?: string[]
          captador_palco_tipos?: string[]
          captador_porte?: string[]
          captador_regioes?: string[]
          captador_taxa?: string
          captador_verificado?: boolean
          career_start_year?: number | null
          city?: string
          created_at?: string
          current_moment?: string
          display_name?: string
          full_name?: string
          id?: string
          is_captador?: boolean
          last_onboarding_project_id?: string | null
          main_pain?: string
          onboarding_completed?: boolean
          onboarding_version?: number
          origin?: string
          plan?: string
          primary_genre?: string | null
          projects_completed?: number
          public_email?: string
          public_profile_enabled?: boolean
          show_public_email?: boolean
          show_public_whatsapp?: boolean
          specialties?: string[]
          state?: string | null
          track_view_mode?: string
          updated_at?: string
          user_type?: string
          username?: string | null
          whatsapp?: string
          work_links?: Json
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_last_onboarding_project_id_fkey"
            columns: ["last_onboarding_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
          specialty_category: string | null
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
          specialty_category?: string | null
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
          specialty_category?: string | null
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
          artist_state: string | null
          audience_size_at_start: string | null
          bpm: number
          completed: boolean
          created_at: string
          distributor: string | null
          estimated_months: number | null
          genre: string | null
          id: string
          key: string
          lufs: number
          master_done: boolean
          mix_percent: number
          name: string
          notes: string
          perfil_cultural: Json
          production_start_date: string | null
          project_type: string
          revenue_estimate: number
          stage: string
          streaming_ready: boolean | null
          subgenre: string | null
          total_contract_value: number | null
          track_count: number | null
          updated_at: string
          upload_date: string
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          artist?: string
          artist_state?: string | null
          audience_size_at_start?: string | null
          bpm?: number
          completed?: boolean
          created_at?: string
          distributor?: string | null
          estimated_months?: number | null
          genre?: string | null
          id?: string
          key?: string
          lufs?: number
          master_done?: boolean
          mix_percent?: number
          name: string
          notes?: string
          perfil_cultural?: Json
          production_start_date?: string | null
          project_type?: string
          revenue_estimate?: number
          stage?: string
          streaming_ready?: boolean | null
          subgenre?: string | null
          total_contract_value?: number | null
          track_count?: number | null
          updated_at?: string
          upload_date?: string
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          artist?: string
          artist_state?: string | null
          audience_size_at_start?: string | null
          bpm?: number
          completed?: boolean
          created_at?: string
          distributor?: string | null
          estimated_months?: number | null
          genre?: string | null
          id?: string
          key?: string
          lufs?: number
          master_done?: boolean
          mix_percent?: number
          name?: string
          notes?: string
          perfil_cultural?: Json
          production_start_date?: string | null
          project_type?: string
          revenue_estimate?: number
          stage?: string
          streaming_ready?: boolean | null
          subgenre?: string | null
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
      service_proposals: {
        Row: {
          created_at: string
          delivery_days: number
          id: string
          message: string
          price: number
          provider_curated_id: string | null
          provider_professional_id: string | null
          provider_user_id: string | null
          request_id: string
          responder_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_days?: number
          id?: string
          message?: string
          price?: number
          provider_curated_id?: string | null
          provider_professional_id?: string | null
          provider_user_id?: string | null
          request_id: string
          responder_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_days?: number
          id?: string
          message?: string
          price?: number
          provider_curated_id?: string | null
          provider_professional_id?: string | null
          provider_user_id?: string | null
          request_id?: string
          responder_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_proposals_provider_curated_id_fkey"
            columns: ["provider_curated_id"]
            isOneToOne: false
            referencedRelation: "marketplace_curated_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          briefing: string
          budget_hint: string
          closed_at: string | null
          created_at: string
          desired_deadline: string | null
          id: string
          project_id: string | null
          reference_url: string
          requester_user_id: string
          specialty_needed: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          briefing?: string
          budget_hint?: string
          closed_at?: string | null
          created_at?: string
          desired_deadline?: string | null
          id?: string
          project_id?: string | null
          reference_url?: string
          requester_user_id: string
          specialty_needed?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          briefing?: string
          budget_hint?: string
          closed_at?: string | null
          created_at?: string
          desired_deadline?: string | null
          id?: string
          project_id?: string | null
          reference_url?: string
          requester_user_id?: string
          specialty_needed?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      spotify_releases: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          imported_at: string
          name: string
          release_date: string | null
          release_type: string
          spotify_album_id: string
          spotify_album_uri: string | null
          total_tracks: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          imported_at?: string
          name: string
          release_date?: string | null
          release_type?: string
          spotify_album_id: string
          spotify_album_uri?: string | null
          total_tracks?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          imported_at?: string
          name?: string
          release_date?: string | null
          release_type?: string
          spotify_album_id?: string
          spotify_album_uri?: string | null
          total_tracks?: number | null
          user_id?: string
        }
        Relationships: []
      }
      spotify_tracks: {
        Row: {
          created_at: string
          duration_ms: number | null
          id: string
          isrc: string | null
          name: string
          release_id: string
          spotify_track_id: string
          spotify_track_uri: string
          track_number: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          id?: string
          isrc?: string | null
          name: string
          release_id: string
          spotify_track_id: string
          spotify_track_uri: string
          track_number?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          id?: string
          isrc?: string | null
          name?: string
          release_id?: string
          spotify_track_id?: string
          spotify_track_uri?: string
          track_number?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spotify_tracks_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "spotify_releases"
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
      visual_briefing_shares: {
        Row: {
          briefing_id: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          revoked_at: string | null
          token: string
          view_count: number
        }
        Insert: {
          briefing_id: string
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          revoked_at?: string | null
          token: string
          view_count?: number
        }
        Update: {
          briefing_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          revoked_at?: string | null
          token?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "visual_briefing_shares_briefing_id_fkey"
            columns: ["briefing_id"]
            isOneToOne: false
            referencedRelation: "visual_briefings"
            referencedColumns: ["id"]
          },
        ]
      }
      visual_briefings: {
        Row: {
          approved_copy: string
          approved_images: Json
          artistic_profile: Json
          copy_options: Json
          created_at: string
          current_step: string
          designer_notes: string
          generated_images: Json
          generated_palette: Json
          id: string
          pdf_url: string | null
          project_id: string
          regeneration_count: number
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          approved_copy?: string
          approved_images?: Json
          artistic_profile?: Json
          copy_options?: Json
          created_at?: string
          current_step?: string
          designer_notes?: string
          generated_images?: Json
          generated_palette?: Json
          id?: string
          pdf_url?: string | null
          project_id: string
          regeneration_count?: number
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          approved_copy?: string
          approved_images?: Json
          artistic_profile?: Json
          copy_options?: Json
          created_at?: string
          current_step?: string
          designer_notes?: string
          generated_images?: Json
          generated_palette?: Json
          id?: string
          pdf_url?: string | null
          project_id?: string
          regeneration_count?: number
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
    }
    Views: {
      analytics_funnel_daily: {
        Row: {
          day: string | null
          event_name: string | null
          total: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      marketplace_providers: {
        Row: {
          accept_invites: boolean | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          genres: string[] | null
          handle: string | null
          is_user: boolean | null
          name: string | null
          projects_completed: number | null
          provider_ref: string | null
          source: string | null
          specialties: string[] | null
          state: string | null
        }
        Relationships: []
      }
      music_dna_benchmarks: {
        Row: {
          atualizado_em: string | null
          avg_acousticness: number | null
          avg_danceability: number | null
          avg_dynamic_range_db: number | null
          avg_energy: number | null
          avg_instrumentalness: number | null
          avg_liveness: number | null
          avg_loudness_db: number | null
          avg_lufs: number | null
          avg_spectral_centroid: number | null
          avg_spectral_flatness: number | null
          avg_speechiness: number | null
          avg_tempo_bpm: number | null
          avg_valence: number | null
          avg_zero_crossing_rate: number | null
          genero: string | null
          id: string | null
          top_keys: Json | null
          total_artistas: number | null
          total_faixas: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_service_proposal: {
        Args: { p_proposal_id: string }
        Returns: Json
      }
      apply_genre_import_2026: {
        Args: { p_drop_staging?: boolean }
        Returns: Json
      }
      can_access_project_realtime: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      cosine_similarity_f8: {
        Args: { a: number[]; b: number[] }
        Returns: number
      }
      count_reference_tracks_by_genre: {
        Args: { p_genre: string }
        Returns: number
      }
      expire_old_invitations: { Args: never; Returns: number }
      find_nearest_reference_tracks: {
        Args: {
          p_acousticness?: number
          p_chroma_cens?: number[]
          p_danceability?: number
          p_dynamic_range_db?: number
          p_energy?: number
          p_genre_labels?: string[]
          p_instrumentalness?: number
          p_key_name?: string
          p_limit?: number
          p_liveness?: number
          p_lufs_integrated?: number
          p_mfcc?: number[]
          p_mode?: string
          p_spectral_bandwidth?: number
          p_spectral_centroid?: number
          p_spectral_flatness?: number
          p_spectral_rolloff?: number
          p_speechiness?: number
          p_strict_genre?: boolean
          p_tempo_bpm?: number
          p_valence?: number
          p_zero_crossing_rate?: number
        }
        Returns: {
          acousticness: number
          band: string
          danceability: number
          dynamic_range_db: number
          energy: number
          filename: string
          genre: string
          instrumentalness: number
          key_name: string
          liveness: number
          lufs_integrated: number
          mode: string
          similarity_score: number
          spectral_centroid: number
          spectral_flatness: number
          speechiness: number
          tempo_bpm: number
          valence: number
          zero_crossing_rate: number
        }[]
      }
      find_public_profile_by_email: {
        Args: { p_email: string }
        Returns: {
          display_name: string
          username: string
        }[]
      }
      genre_canonical: { Args: { p_genre: string }; Returns: string }
      genre_parent: { Args: { p_genero: string }; Returns: string }
      get_auth_email: { Args: never; Returns: string }
      get_benchmark_for_genre: {
        Args: { p_genero: string }
        Returns: {
          atualizado_em: string | null
          avg_acousticness: number | null
          avg_danceability: number | null
          avg_dynamic_range_db: number | null
          avg_energy: number | null
          avg_instrumentalness: number | null
          avg_liveness: number | null
          avg_loudness_db: number | null
          avg_lufs: number | null
          avg_spectral_centroid: number | null
          avg_spectral_flatness: number | null
          avg_speechiness: number | null
          avg_tempo_bpm: number | null
          avg_valence: number | null
          avg_zero_crossing_rate: number | null
          genero: string | null
          id: string | null
          top_keys: Json | null
          total_artistas: number | null
          total_faixas: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "music_dna_benchmarks"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_extract_metrics: {
        Args: { p_days?: number }
        Returns: {
          avg_attempts_to_success: number
          failure_rate: number
          failures_by_cause: Json
          retry_rate: number
          total_attempts: number
          total_failed: number
          total_success: number
        }[]
      }
      get_file_download_url: { Args: { p_file_id: string }; Returns: string }
      get_genre_reference_examples: {
        Args: { p_genero: string; p_limit?: number }
        Returns: {
          band: string
          danceability: number
          dynamic_range_db: number
          energy: number
          filename: string
          key_name: string
          lufs_integrated: number
          mode: string
          tempo_bpm: number
          valence: number
        }[]
      }
      get_genre_section_stats: {
        Args: { p_genre: string }
        Returns: {
          p50_duration_sec: number
          p50_seconds_to_first_chorus_estimate: number
          p50_segments_count: number
          sample_size: number
        }[]
      }
      get_genre_taxonomy: {
        Args: never
        Returns: {
          active_count: number
          canonical: string
          label: string
          parent: string
          quarantined_count: number
        }[]
      }
      get_marketplace_providers: {
        Args: {
          p_genre?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_specialty?: string
          p_state?: string
        }
        Returns: {
          accept_invites: boolean
          avatar_url: string
          bio: string
          city: string
          genres: string[]
          handle: string
          is_user: boolean
          name: string
          projects_completed: number
          provider_ref: string
          source: string
          specialties: string[]
          state: string
        }[]
      }
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
      get_oportunidades_search_metrics: {
        Args: { p_days?: number }
        Returns: Json
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
      get_provider_public_rating: {
        Args: { p_provider_email?: string; p_provider_name: string }
        Returns: {
          avg_stars: number
          rating_count: number
        }[]
      }
      get_public_captadores: {
        Args: never
        Returns: {
          avatar_url: string
          bio: string
          captador_generos: string[]
          captador_palco_tipos: string[]
          captador_porte: string[]
          captador_regioes: string[]
          captador_taxa: string
          captador_verificado: boolean
          city: string
          display_name: string
          id: string
          public_email: string
          state: string
          username: string
          whatsapp: string
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
          public_profile_enabled: boolean
          specialties: string[]
          username: string
          whatsapp: string
          work_links: Json
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
      get_summary_variant_stats: {
        Args: never
        Returns: {
          composite_score: number
          copied_rate: number
          sample_size: number
          saved_rate: number
          summary_variant: string
          task_created_rate: number
          thumbs_down_rate: number
          thumbs_up_rate: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_user_applications: {
        Args: never
        Returns: {
          area: string
          created_at: string
          data_inscricao: string
          data_resultado: string
          estado: string
          id: string
          licoes_aprendidas: string
          link: string
          link_checked_at: string
          link_status: string
          motivo_recusa: string
          notas: string
          opportunity_id: string
          orgao: string
          prazo: string
          project_id: string
          resultado: string
          resumo: string
          status: string
          tipo: string
          titulo: string
          updated_at: string
          user_id: string
          valor_aprovado: number
        }[]
      }
      recalcular_benchmark_genero: {
        Args: { p_genero: string }
        Returns: undefined
      }
      report_reference_coverage: {
        Args: never
        Returns: {
          active: number
          avg_dims_filled: number
          bpm_stddev: number
          centroid_stddev: number
          distinct_bands_active: number
          dr_stddev: number
          genre: string
          healthy_pct: number
          lufs_stddev: number
          monopoly_risk: number
          pct_above_floor: number
          quality_label: string
          quality_score: number
          quarantined: number
          total: number
          tracks_per_band_avg: number
          tracks_per_band_max: number
        }[]
      }
      reset_genre_import_staging: { Args: never; Returns: undefined }
      revoke_project_invitation: {
        Args: { p_invitation_id: string }
        Returns: Json
      }
      upsert_reference_tracks: {
        Args: { p_rows: Json }
        Returns: {
          genres_updated: string[]
          inserted_count: number
          updated_count: number
        }[]
      }
      verify_cron_token: { Args: { p_token: string }; Returns: boolean }
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
