import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLoanTables1739812800000 implements MigrationInterface {
  name = 'CreateLoanTables1739812800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "loan_applications_state_enum" AS ENUM (
        'DRAFT',
        'CREDIT_PASSED',
        'APPROVED',
        'REJECTED'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "credit_assessments_result_enum" AS ENUM (
        'PASS',
        'FAIL'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "loan_applications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "applicant_name" varchar(255) NOT NULL,
        "monthly_income" bigint NOT NULL,
        "requested_loan_amount" bigint NOT NULL,
        "tenor_in_months" integer NOT NULL,
        "state" "loan_applications_state_enum" NOT NULL DEFAULT 'DRAFT',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_loan_applications" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_loan_applications_state" ON "loan_applications" ("state")
    `);

    await queryRunner.query(`
      CREATE TABLE "credit_assessments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "loan_application_id" uuid NOT NULL,
        "result" "credit_assessments_result_enum" NOT NULL,
        "monthly_installment" bigint NOT NULL,
        "rejection_reason" varchar(500),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_credit_assessments" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_credit_assessments_loan_application_id" UNIQUE ("loan_application_id"),
        CONSTRAINT "FK_credit_assessments_loan_application" FOREIGN KEY ("loan_application_id")
          REFERENCES "loan_applications"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "credit_assessments"`);
    await queryRunner.query(`DROP TABLE "loan_applications"`);
    await queryRunner.query(`DROP TYPE "credit_assessments_result_enum"`);
    await queryRunner.query(`DROP TYPE "loan_applications_state_enum"`);
  }
}
