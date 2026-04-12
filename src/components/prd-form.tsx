import { FormEvent, Dispatch, SetStateAction } from 'react';
import { PrdInput } from '../lib/prd';
import { useLanguage } from '../i18n/language-provider';
import { Button } from './button';
import { InputField } from './input-field';
import { Section } from './section';
import { TextareaField } from './textarea-field';

interface PRDFormProps {
  prdInput: PrdInput;
  setPrdInput: Dispatch<SetStateAction<PrdInput>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  onRefineSection: (sectionTitle: string) => void;
}

export function PRDForm({
  prdInput,
  setPrdInput,
  onSubmit,
  isLoading,
  onRefineSection
}: PRDFormProps) {
  const { t } = useLanguage();
  const handleChange: React.ChangeEventHandler<
    HTMLInputElement | HTMLTextAreaElement
  > = (event) => {
    const { name, value } = event.target;
    setPrdInput((previous) => ({ ...previous, [name]: value }));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Section
        title={t('form.section1')}
        onRefine={() => onRefineSection('1. Core Product Idea')}
      >
        <InputField
          label={t('form.productName')}
          id="productName"
          name="productName"
          value={prdInput.productName}
          onChange={handleChange}
          placeholder={t('form.productNamePlaceholder')}
          required
        />
        <TextareaField
          label={t('form.problemStatement')}
          id="problemStatement"
          name="problemStatement"
          value={prdInput.problemStatement}
          onChange={handleChange}
          description={t('form.problemStatementDesc')}
          placeholder={t('form.problemStatementPlaceholder')}
          required
        />
        <TextareaField
          label={t('form.proposedSolution')}
          id="proposedSolution"
          name="proposedSolution"
          value={prdInput.proposedSolution}
          onChange={handleChange}
          description={t('form.proposedSolutionDesc')}
          placeholder={t('form.proposedSolutionPlaceholder')}
          required
        />
      </Section>

      <Section
        title={t('form.section2')}
        onRefine={() => onRefineSection('2. Audience & Market')}
      >
        <TextareaField
          label={t('form.targetAudience')}
          id="targetAudience"
          name="targetAudience"
          value={prdInput.targetAudience}
          onChange={handleChange}
          description={t('form.targetAudienceDesc')}
          placeholder={t('form.targetAudiencePlaceholder')}
          required
        />
        <TextareaField
          label={t('form.businessGoals')}
          id="businessGoals"
          name="businessGoals"
          value={prdInput.businessGoals}
          onChange={handleChange}
          description={t('form.businessGoalsDesc')}
          placeholder={t('form.businessGoalsPlaceholder')}
        />
      </Section>

      <Section
        title={t('form.section3')}
        onRefine={() => onRefineSection('3. Features & Scope')}
      >
        <TextareaField
          label={t('form.coreFeatures')}
          id="coreFeatures"
          name="coreFeatures"
          value={prdInput.coreFeatures}
          onChange={handleChange}
          description={t('form.coreFeaturesDesc')}
          placeholder={t('form.coreFeaturesPlaceholder')}
          required
        />
        <TextareaField
          label={t('form.futureFeatures')}
          id="futureFeatures"
          name="futureFeatures"
          value={prdInput.futureFeatures}
          onChange={handleChange}
          description={t('form.futureFeaturesDesc')}
          placeholder={t('form.futureFeaturesPlaceholder')}
        />
      </Section>

      <Section
        title={t('form.section4')}
        onRefine={() => onRefineSection('4. Technical Details (Optional)')}
      >
        <TextareaField
          label={t('form.techStack')}
          id="techStack"
          name="techStack"
          value={prdInput.techStack}
          onChange={handleChange}
          placeholder={t('form.techStackPlaceholder')}
          rows={3}
        />
        <TextareaField
          label={t('form.constraints')}
          id="constraints"
          name="constraints"
          value={prdInput.constraints}
          onChange={handleChange}
          description={t('form.constraintsDesc')}
          placeholder={t('form.constraintsPlaceholder')}
        />
      </Section>

      <div className="pt-2">
        <Button type="submit" isLoading={isLoading} size="lg">
          {t('form.generatePrd')}
        </Button>
      </div>
    </form>
  );
}
