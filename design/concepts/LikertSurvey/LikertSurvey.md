**concept** LikertSurvey [Author, Respondent]

**purpose** Measure attitudes or opinions by asking respondents to rate statements on a predefined numeric scale.

**principle** A survey has an author, a title, and a numeric scale (min/max). Questions belong to a survey. Respondents submit one response per question within the survey's scale. Responses can be updated.

**state**

a set of Surveys with

- an author Author
- a title String
- a scaleMin Number
- a scaleMax Number

a set of Questions with

- a survey Survey
- a text String

a set of Responses with

- a respondent Respondent
- a question Question
- a value Number

**actions**

createSurvey(author: Author, title: String, scaleMin: Number, scaleMax: Number): { survey }

- **requires** scaleMin < scaleMax
- **effects** creates a new survey and returns its id

addQuestion(survey: Survey, text: String): { question }

- **requires** survey exists
- **effects** creates a new question linked to the survey and returns its id

submitResponse(respondent: Respondent, question: Question, value: Number)

- **requires** question exists; respondent has not already answered this question; value is within the survey's scale
- **effects** records a new response for the respondent and question

updateResponse(respondent: Respondent, question: Question, value: Number)

- **requires** existing response for respondent/question; value within survey scale
- **effects** updates the recorded response value

**queries**

_getSurveyQuestions(survey: Survey) -> QuestionDoc[]

- **effects** returns all questions for the specified survey

_getSurveyResponses(survey: Survey) -> ResponseDoc[]

- **effects** returns all responses for the specified survey (all questions)

_getRespondentAnswers(respondent: Respondent) -> ResponseDoc[]

- **effects** returns all answers submitted by the respondent
