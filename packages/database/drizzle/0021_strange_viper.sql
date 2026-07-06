CREATE INDEX "ai_conversations_user_pinned_updated_idx" ON "ai_conversations" USING btree ("user_id","pinned_at","updated_at");--> statement-breakpoint
CREATE INDEX "ai_messages_conversation_created_at_idx" ON "ai_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "categorization_rules_user_enabled_priority_idx" ON "categorization_rules" USING btree ("user_id","enabled","priority");--> statement-breakpoint
CREATE INDEX "dividends_user_ex_date_idx" ON "dividends" USING btree ("user_id","ex_date");--> statement-breakpoint
CREATE INDEX "raw_emails_user_category_received_at_id_idx" ON "raw_emails" USING btree ("user_id","category","received_at","id");--> statement-breakpoint
CREATE INDEX "transactions_user_transaction_date_id_idx" ON "transactions" USING btree ("user_id","transaction_date","id");--> statement-breakpoint
CREATE INDEX "transactions_user_type_date_idx" ON "transactions" USING btree ("user_id","transaction_type","transaction_date");--> statement-breakpoint
CREATE INDEX "transactions_user_type_mode_date_idx" ON "transactions" USING btree ("user_id","transaction_type","transaction_mode","transaction_date");--> statement-breakpoint
CREATE INDEX "transactions_user_card_last4_date_idx" ON "transactions" USING btree ("user_id","card_last4","transaction_date");--> statement-breakpoint
CREATE INDEX "transactions_user_requires_review_date_idx" ON "transactions" USING btree ("user_id","requires_review","transaction_date");--> statement-breakpoint
CREATE INDEX "transactions_user_categorization_method_date_idx" ON "transactions" USING btree ("user_id","categorization_method","transaction_date");--> statement-breakpoint
CREATE INDEX "transactions_user_merchant_idx" ON "transactions" USING btree ("user_id","merchant");--> statement-breakpoint
CREATE INDEX "rule_dashboards_user_updated_at_idx" ON "rule_dashboards" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "flight_activities_user_departure_segment_id_idx" ON "flight_activities" USING btree ("user_id","departure_date","segment_index","id");--> statement-breakpoint
CREATE INDEX "flight_activities_user_source_email_idx" ON "flight_activities" USING btree ("user_id","source_email_id");--> statement-breakpoint
CREATE INDEX "hotel_stays_user_archived_check_in_created_idx" ON "hotel_stays" USING btree ("user_id","archived_at","check_in_date","created_at");