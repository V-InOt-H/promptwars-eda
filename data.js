export const PRE_BASED_ANSWERS = {
  'voting-age': {
    'ai_is_pro': [
      "If teenagers can work and pay taxes at 16, they deserve a say in how that money is spent. It's about 'no taxation without representation'!",
      "School civics classes are fresh in their minds. 16-year-olds are often more informed about current affairs than many busy adults.",
      "Engaging voters early builds a lifelong habit of democratic participation. Countries like Austria and Brazil already do this successfully!",
      "Modern 16-year-olds have unprecedented access to information via digital platforms, arguably making them more prepared than previous generations.",
      "Young people will live with the consequences of long-term policies (like climate change or debt) far longer than older voters. They should have a say now."
    ],
    'ai_is_con': [
      "18 is the legal age of adulthood for a reason. Voting requires a level of maturity and life experience that 16-year-olds are still developing.",
      "The brain's prefrontal cortex, responsible for complex decision-making, isn't fully formed at 16. We should wait for legal adulthood.",
      "School should be for learning, not political campaigning. Lowering the age could turn classrooms into battlegrounds for political parties.",
      "16-year-olds are often economically dependent on their parents, which could lead to their votes being unduly influenced by family pressure.",
      "Most global standards project 18 as the threshold for legal responsibility. Voting is the ultimate responsibility and should align with that."
    ]
  },
  'evm': {
    'ai_is_pro': [
      "EVMs in India are standalone machines, not connected to any network or the internet. This makes remote hacking physically impossible.",
      "The VVPAT system provides a physical paper trail that the voter can see. It's the ultimate 'trust but verify' mechanism for our democracy.",
      "Manual paper counting is prone to human error, booth capturing, and takes days. EVMs are faster, more accurate, and much more secure.",
      "Each EVM goes through a rigorous 'Mock Poll' in front of all party agents before the real voting begins to ensure zero tampering.",
      "The Election Commission uses a secure manufacturing process by two PSUs, ensuring that the hardware itself is never compromised."
    ],
    'ai_is_con': [
      "Any electronic device can be manipulated if someone has physical access to the chips or software. Paper is the only thing we truly 'see'.",
      "Many developed democracies like Germany and the Netherlands moved back to paper ballots because they didn't fully trust electronic systems.",
      "If a voter can't verify the code inside the machine, they are essentially taking a leap of faith. We need total transparency, not black boxes.",
      "The current VVPAT slip only stays visible for 7 seconds. We need a 100% manual count of all slips to ensure they actually match the electronic total.",
      "Electronic systems lack 'public auditability' where an average person can understand the process. Only tech experts can really verify an EVM."
    ]
  },
  'nota': {
    'ai_is_pro': [
      "If NOTA wins, it means the public has rejected all candidates. Forcing a re-election with new candidates is the only way to ensure true accountability.",
      "Currently, NOTA is just a 'protest' button with no teeth. Giving it power would force political parties to field better, cleaner candidates.",
      "Democracy is about the right to choose, and also the right to reject. A NOTA victory should be a legal mandate for fresh options.",
      "Low voter turnout is often due to bad candidates. If people knew NOTA could actually change the lineup, they'd be more likely to show up.",
      "Why should a candidate win just for being 'less bad' than the others? A NOTA majority proves the current slate is unacceptable."
    ],
    'ai_is_con': [
      "Re-elections are incredibly expensive and would stall governance for months. We need stability, not constant loops of voting.",
      "If NOTA keeps winning, the seat remains vacant. Who represents the people in the meantime? It creates a dangerous power vacuum.",
      "NOTA already serves its purpose by signaling voter dissatisfaction. We should focus on improving candidate selection through internal party reforms.",
      "A 'Right to Reject' could be misused by organized groups to consistently block elections, leading to constitutional crises.",
      "The existing NOTA option is enough for expression. Turning it into a 'power to disqualify' could be weaponized by political rivals."
    ]
  },
  'compulsory': {
    'ai_is_pro': [
      "Voting is a civic duty, just like paying taxes. If everyone is forced to vote, the government truly represents the entire population.",
      "Compulsory voting eliminates 'voter apathy' and forces parties to address the concerns of everyone, not just their motivated base.",
      "Australia has had compulsory voting since 1924 and boasts one of the most stable and representative democracies in the world.",
      "It reduces the influence of polarization, as politicians have to appeal to the sensible middle, not just the loud, extreme fringes.",
      "If voting is mandatory, the government must also ensure it's incredibly easy to do so, leading to better electoral infrastructure for all."
    ],
    'ai_is_con': [
      "The right to vote must include the right NOT to vote. Forced participation is a violation of personal liberty and freedom of expression.",
      "Compulsory voting leads to 'donkey voting' where people just randomly tick boxes to avoid a fine, which actually degrades the quality of the result.",
      "We should make people WANT to vote by providing better candidates and education, not by threatening them with legal penalties.",
      "Forcing uninterested or uninformed citizens to vote could actually lead to less rational and more easily manipulated election results.",
      "Democracy is about voluntary participation. Once you introduce coercion, you're moving away from the very spirit of freedom."
    ]
  },
  'social-media': {
    'ai_is_pro': [
      "Paid ads allow for 'micro-targeting' which manipulates specific groups with different, sometimes contradictory, messages. It's devious.",
      "The sheer amount of money spent on digital ads gives an unfair advantage to rich parties, drowning out smaller, grassroots voices.",
      "Online ads are the primary vehicle for deepfakes and misinformation. Banning paid political ads is the first step to cleaning up our feed.",
      "Platforms use opaque algorithms that prioritize sensationalism. Paying to boost these posts only amplifies the most divisive content.",
      "Voters should find their own information instead of being 'chased' by algorithms and ads based on their private browsing data."
    ],
    'ai_is_con': [
      "Social media is where young voters actually are. Banning ads there would make it harder for new parties to reach the youth cheaply.",
      "Why ban only online ads? If TV and newspapers can have political ads, banning them online is discriminatory and ineffective.",
      "The solution is better regulation and transparency labels, not a total ban. Voters are smart enough to judge information for themselves.",
      "Political ads are a form of political speech. Banning them could be seen as an infringement on the constitutional right to freedom of speech.",
      "Ads are often the only way for independent candidates to get their names out in a media landscape dominated by big established names."
    ]
  }
};

export const PRE_BASED_PROCESS = {
  'registration': "To vote, you must be 18+ and registered in the electoral roll. Apply online via the Voters Service Portal (voters.eci.gov.in) or use the Voter Helpline App with proof of age and residence.",
  'campaigning': "Candidates follow the Model Code of Conduct (MCC) to ensure fair play. It prevents the use of government resources for campaigning and restricts disruptive behavior before polling day.",
  'evm': "EVMs are standalone, tamper-proof machines used with VVPATs. When you vote, the VVPAT prints a slip showing your choice for 7 seconds, providing a physical verification of your electronic vote.",
  'counting': "Votes are counted in a secure, transparent environment under the supervision of Returning Officers. Every round is audited, and party agents are present to witness the entire process before the final Result declaration.",
  'post': "After the results are certified by the ECI, the largest party or coalition is invited to form the government. The elected representatives then take their oath in the Parliament or State Assembly."
};
