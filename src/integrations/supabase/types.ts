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
      editais: {
        Row: {
          abertura: string | null
          area: string | null
          created_at: string | null
          documentos_resumo: string
          estado: string | null
          id: string
          inferido: boolean | null
          inscrito: boolean
          link: string | null
          orgao: string | null
          origem_url: string | null
          prazo: string | null
          project_id: string | null
          publico_alvo: string
          resumo: string
          session_key: string | null
          status: string | null
          tipo: string
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
          id?: string
          inferido?: boolean | null
          inscrito?: boolean
          link?: string | null
          orgao?: string | null
          origem_url?: string | null
          prazo?: string | null
          project_id?: string | null
          publico_alvo?: string
          resumo?: string
          session_key?: string | null
          status?: string | null
          tipo?: string
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
          id?: string
          inferido?: boolean | null
          inscrito?: boolean
          link?: string | null
          orgao?: string | null
          origem_url?: string | null
          prazo?: string | null
          project_id?: string | null
          publico_alvo?: string
          resumo?: string
          session_key?: string | null
          status?: string | null
          tipo?: string
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
          created_at: string
          data_inscricao: string | null
          data_resultado: string | null
          edital_id: string
          id: string
          licoes_aprendidas: string | null
          motivo_recusa: string | null
          notas: string
          project_id: string | null
          resultado: string | null
          status: string
          tipo: string
          updated_at: string
          user_id: string
          valor_aprovado: number | null
        }
        Insert: {
          created_at?: string
          data_inscricao?: string | null
          data_resultado?: string | null
          edital_id: string
          id?: string
          licoes_aprendidas?: string | null
          motivo_recusa?: string | null
          notas?: string
          project_id?: string | null
          resultado?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          user_id: string
          valor_aprovado?: number | null
        }
        Update: {
          created_at?: string
          data_inscricao?: string | null
          data_resultado?: string | null
          edital_id?: string
          id?: string
          licoes_aprendidas?: string | null
          motivo_recusa?: string | null
          notas?: string
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
            foreignKeyName: "edital_applications_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "editais"
            referencedColumns: ["id"]
          },
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
          created_at: string
          danceability: number | null
          deezer_id: number | null
          diagnosis: Json
          duration_ms: number | null
          dynamic_range_db: number | null
          energy: number | null
          fonte_analise: string | null
          genre: string
          id: string
          input_metadata: Json
          instrumentalness: number | null
          isrc: string | null
          key_name: string | null
          key_number: number | null
          liveness: number | null
          loudness_db: number | null
          lufs_integrated: number | null
          mbid: string | null
          mode_name: string | null
          mode_number: number | null
          project_id: string | null
          speechiness: number | null
          spotify_id: string | null
          tempo_bpm: number | null
          time_signature: number | null
          track_name: string
          user_id: string
          valence: number | null
        }
        Insert: {
          acousticness?: number | null
          created_at?: string
          danceability?: number | null
          deezer_id?: number | null
          diagnosis?: Json
          duration_ms?: number | null
          dynamic_range_db?: number | null
          energy?: number | null
          fonte_analise?: string | null
          genre?: string
          id?: string
          input_metadata?: Json
          instrumentalness?: number | null
          isrc?: string | null
          key_name?: string | null
          key_number?: number | null
          liveness?: number | null
          loudness_db?: number | null
          lufs_integrated?: number | null
          mbid?: string | null
          mode_name?: string | null
          mode_number?: number | null
          project_id?: string | null
          speechiness?: number | null
          spotify_id?: string | null
          tempo_bpm?: number | null
          time_signature?: number | null
          track_name?: string
          user_id: string
          valence?: number | null
        }
        Update: {
          acousticness?: number | null
          created_at?: string
          danceability?: number | null
          deezer_id?: number | null
          diagnosis?: Json
          duration_ms?: number | null
          dynamic_range_db?: number | null
          energy?: number | null
          fonte_analise?: string | null
          genre?: string
          id?: string
          input_metadata?: Json
          instrumentalness?: number | null
          isrc?: string | null
          key_name?: string | null
          key_number?: number | null
          liveness?: number | null
          loudness_db?: number | null
          lufs_integrated?: number | null
          mbid?: string | null
          mode_name?: string | null
          mode_number?: number | null
          project_id?: string | null
          speechiness?: number | null
          spotify_id?: string | null
          tempo_bpm?: number | null
          time_signature?: number | null
          track_name?: string
          user_id?: string
          valence?: number | null
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
          genero: string
          id: string
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
          genero: string
          id?: string
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
          genero?: string
          id?: string
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
      palcos_curados: {
        Row: {
          ativo: boolean | null
          cachet_medio: string | null
          created_at: string | null
          estado: string | null
          generos: string[] | null
          id: string
          link: string | null
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
          career_start_year: number | null
          city: string
          created_at: string
          current_moment: string
          display_name: string
          id: string
          last_onboarding_project_id: string | null
          main_pain: string
          onboarding_completed: boolean
          onboarding_version: number
          origin: string
          plan: string
          primary_genre: string | null
          projects_completed: number
          public_email: string
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
          career_start_year?: number | null
          city?: string
          created_at?: string
          current_moment?: string
          display_name?: string
          id: string
          last_onboarding_project_id?: string | null
          main_pain?: string
          onboarding_completed?: boolean
          onboarding_version?: number
          origin?: string
          plan?: string
          primary_genre?: string | null
          projects_completed?: number
          public_email?: string
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
          career_start_year?: number | null
          city?: string
          created_at?: string
          current_moment?: string
          display_name?: string
          id?: string
          last_onboarding_project_id?: string | null
          main_pain?: string
          onboarding_completed?: boolean
          onboarding_version?: number
          origin?: string
          plan?: string
          primary_genre?: string | null
          projects_completed?: number
          public_email?: string
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
      rascunhos_editais: {
        Row: {
          campos: Json
          created_at: string
          edital_id: string | null
          id: string
          progresso: number
          project_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          campos?: Json
          created_at?: string
          edital_id?: string | null
          id?: string
          progresso?: number
          project_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          campos?: Json
          created_at?: string
          edital_id?: string | null
          id?: string
          progresso?: number
          project_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rascunhos_editais_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "editais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rascunhos_editais_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      track_intelligence_analyses: {
        Row: {
          artwork_status: string
          consolidated_score: number | null
          created_at: string
          diagnosis: Json | null
          distributor_status: string
          error_message: string | null
          genre: string
          id: string
          master_status: string
          project_id: string | null
          release_goal: string
          score_label: string | null
          status: string
          target_audience: string
          target_platforms: string[]
          target_release_date: string
          track_title: string
          user_id: string
        }
        Insert: {
          artwork_status: string
          consolidated_score?: number | null
          created_at?: string
          diagnosis?: Json | null
          distributor_status: string
          error_message?: string | null
          genre: string
          id?: string
          master_status: string
          project_id?: string | null
          release_goal: string
          score_label?: string | null
          status?: string
          target_audience: string
          target_platforms?: string[]
          target_release_date: string
          track_title: string
          user_id: string
        }
        Update: {
          artwork_status?: string
          consolidated_score?: number | null
          created_at?: string
          diagnosis?: Json | null
          distributor_status?: string
          error_message?: string | null
          genre?: string
          id?: string
          master_status?: string
          project_id?: string | null
          release_goal?: string
          score_label?: string | null
          status?: string
          target_audience?: string
          target_platforms?: string[]
          target_release_date?: string
          track_title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_intelligence_analyses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      analytics_funnel_daily: {
        Row: {
          day: string | null
          event_name: string | null
          total: number | null
          unique_users: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      count_reference_tracks_by_genre: {
        Args: { p_genre: string }
        Returns: number
      }
      find_nearest_reference_tracks: {
        Args: {
          p_acousticness?: number
          p_danceability?: number
          p_dynamic_range_db?: number
          p_energy?: number
          p_genre?: string
          p_instrumentalness?: number
          p_key_name?: string
          p_limit?: number
          p_liveness?: number
          p_lufs_integrated?: number
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
          dims_total: number
          dims_used: number
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
      get_auth_email: { Args: never; Returns: string }
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
      recalcular_benchmark_genero: {
        Args: { p_genero: string }
        Returns: undefined
      }
      upsert_reference_tracks: {
        Args: { p_rows: Json }
        Returns: {
          genres_updated: string[]
          inserted_count: number
          updated_count: number
        }[]
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
