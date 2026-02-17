import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRejectionReasonToLoanApplications1739812900000
  implements MigrationInterface
{
  name = 'AddRejectionReasonToLoanApplications1739812900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "loan_applications"
      ADD COLUMN "rejection_reason" varchar(500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "loan_applications"
      DROP COLUMN "rejection_reason"
    `);
  }
}
