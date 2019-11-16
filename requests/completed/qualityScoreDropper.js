// -- Operation QS10 0 Keyword Propper  -- When 10s fall from grace, we should know about it. 
// This script will alert us to any keywords that fall from their 10/10 position by labelling them accordingly
// and emailing off any droppers to the team for action.
// Author: Doug - withSeismic.com
// 16.11.2019

var emailList = [ 'name@withseismic.com', 'name+1@withSeismic.com' ]

var labels = [
  {
    name: 'qualityScoreTen',
    labelString: 'QS10 Champion',
    description: 'A Keyword with a Quality Score of 10',
    colour: '#0055FF'
  },
  {
    name: 'warningLabel',
    labelString: 'QS < 10',
    description: 'A keyword that needs attention - QS < 10',
    colour: '#FF0000' // RED MEANS DANGER, RIGHT?
  }
]

function main() {
  // Laying some groundwork - Firstly, let's check that the right labels exist to do the job.
  // If they don't - say, if you're running this script for the first time - then let's create them using details from the labels array above

  for (var i = 0; i < labels.length; i++) {
    var label = labels[i]
    if (!AdsApp.labels().withCondition('Name = "' + label.labelString + '"').get().hasNext()) {
      AdsApp.createLabel(label.labelString, label.description, label.colour)
      Logger.log('Created %s Label: %s', label.name, label.labelString)
    }
  }

  var flagBucket = [] // Where we'll dump naughty keywords.

  // Step One. Checking existing 10's for changes.. If this is your first run, it won't do much unless you've already labelled your keywords. No need to, as we'll do that anyway in step two.
  // ..Step Two. Tagging our currently live keywords up with the QS10 Label so this script can process them next time it's run.

  var adGroupList = AdsApp.adGroups()
    .withCondition('CampaignStatus = "ENABLED"')
    .withCondition('Status = "ENABLED"')
    .get()
  Logger.log('Processing %s adGroups', adGroupList.totalNumEntities())

  while (adGroupList.hasNext()) {
    var adGroup = adGroupList.next()

    var keywordList = adGroup
      .keywords()
      .withCondition('Status = "ENABLED"')
      .withCondition('LabelNames CONTAINS_ANY ["' + labels[0].labelString + '"]')
      .get()

    while (keywordList.hasNext()) {
      var keyword = keywordList.next()
      if (keyword.getQualityScore() < 10) {
        Logger.log('Keyword Dropped!')
        flagBucket.push(keyword)
        keyword.removeLabel(labels[0].labelString)
        keyword.applyLabel(labels[1].labelString)
      }
    }

    var keywordList = adGroup.keywords().withCondition('QualityScore = 10').get()
    while (keywordList.hasNext()) {
      var keyword = keywordList.next()
      if (keyword.labels().withCondition('labelNames CONTAINS_ANY "' + labels[0].labelString + '"').get()) {
        keyword.applyLabel(labels[0].labelString)
      }
    }
  }

  // Here, we'll make the emails fly - Did you know there's a daily quota of how many emails you can send per day?
  // If you're super script heavy, you might just cap it!

  var droppedKeywordsNo = flagBucket.length

  if (droppedKeywordsNo > 0) {
    var responsibleEmailerQuota = MailApp.getRemainingDailyQuota()
    if (responsibleEmailerQuota < 1) {
      Logger.log('Your daily email quota is out! No emails sent.')
    }

    var htmlString = []
    for (var i = 0; i < flagBucket.length; i++) {
      var keyword = flagBucket[i]
      htmlString.push(
        '<tr><td>' +
          keyword.getCampaign().getName() +
          '</td><td>' +
          keyword.getAdGroup().getName() +
          '</td><td>' +
          keyword.getText() +
          '</td><td>' +
          keyword.getQualityScore() +
          '</td></tr>'
      )
    }

    Logger.log('%s have dropped below QS10 - See email for details.', droppedKeywordsNo)
    MailApp.sendEmail({
      to: emailList.toString(),
      subject: 'QS10 Checker: ' + droppedKeywordsNo + ' Keywords have dropped from QS10!',
      htmlBody:
        '<table style="width:100%; text-align:left;"><tr><th>Campaign</th><th>Adgroup</th><th>Keyword</th><th>New Quality Score</th></tr>' +
        htmlString.toString().replace(/,/g, '') +
        '</table>'
    })
  } else {
    Logger.log('No keyword drops! Congrats')
  }

  Logger.log('Script Completed')
}
